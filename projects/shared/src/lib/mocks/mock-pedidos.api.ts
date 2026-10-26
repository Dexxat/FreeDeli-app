import { DestroyRef, Injectable, InjectionToken, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, delay, distinctUntilChanged, map, of, switchMap, throwError, timer } from 'rxjs';
import { PedidosApi, ResultadoAceptar, ResultadoEntrega } from '../api/pedidos.api';
import { OfertaPedido, Pedido } from '../models/pedido';
import { armarOferta } from '../rules/pedido.rules';
import { asignarRider, confirmarRetiro, entregarConPin, salirEnCamino } from '../rules/flujo.rules';
import { MockDb, OTRO_RIDER_ID, RIDER_ACTUAL_ID } from './mock-db';
import { LATENCIA_MOCK } from './mock-riders.api';

/** Cuánto tarda en llegar un pedido nuevo cuando el rider queda libre y ON, en ms. */
export const DEMORA_OFERTA_MOCK = new InjectionToken<number>('DEMORA_OFERTA_MOCK', { factory: () => 8000 });

const EN_CURSO: Pedido['estado'][] = ['aceptado', 'retirado', 'en-camino'];

/** El pedido del rider: aceptado y en curso, o esperando que el kiosco lo apruebe. */
function esDelRider(p: Pedido, riderId: string): boolean {
  return p.riderId === riderId && (EN_CURSO.includes(p.estado) || (p.estado === 'esperando' && p.fase === 'aprobacion'));
}

@Injectable()
export class MockPedidosApi extends PedidosApi {
  private readonly db = inject(MockDb);
  private readonly latencia = inject(LATENCIA_MOCK);
  private readonly demoraOferta = inject(DEMORA_OFERTA_MOCK);
  private readonly pedidos$ = toObservable(this.db.pedidos);

  private readonly oferta = computed(() => this.db.ofertas()[RIDER_ACTUAL_ID] ?? null);
  private readonly oferta$ = toObservable(this.oferta);

  /** El rider puede recibir un pedido: ON, sin pausa, sin pedido en curso ni oferta pendiente. */
  private readonly libre = computed(() => {
    const r = this.db.riders().find((x) => x.id === RIDER_ACTUAL_ID);
    const ocupado = this.db.pedidos().some((p) => esDelRider(p, RIDER_ACTUAL_ID));
    return !!r && r.disponible && !r.pausado && !ocupado && !this.oferta();
  });

  constructor() {
    super();
    const destroyRef = inject(DestroyRef);

    // Despachador simulado: si el rider queda libre, le llega un pedido de sus zonas.
    const despacho = toObservable(this.libre)
      .pipe(
        distinctUntilChanged(),
        switchMap((libre) => (libre ? timer(this.demoraOferta) : EMPTY)),
      )
      .subscribe(() => this.ofrecer());

    // Vencimiento: si no responde a tiempo, el pedido pasa a otro rider.
    const vencimiento = this.oferta$
      .pipe(switchMap((o) => (o ? timer(Math.max(0, o.expiraEn.getTime() - Date.now())).pipe(map(() => o)) : EMPTY)))
      .subscribe((o) => this.pasarAOtroRider(o.pedidoId));

    destroyRef.onDestroy(() => {
      despacho.unsubscribe();
      vencimiento.unsubscribe();
    });
  }

  private ofrecer(): void {
    const rider = this.db.riders().find((x) => x.id === RIDER_ACTUAL_ID)!;
    const pedido = this.db.crearPedidoEsperando(rider.zonas);
    if (!pedido) return;
    this.db.ofertas.update((o) => ({ ...o, [RIDER_ACTUAL_ID]: armarOferta(pedido, new Date()) }));
  }

  private quitarOferta(): void {
    this.db.ofertas.update(({ [RIDER_ACTUAL_ID]: _, ...resto }) => resto);
  }

  private pasarAOtroRider(pedidoId: string): void {
    this.quitarOferta();
    // Lo toma otro rider (el kiosco simulado lo aprueba después).
    const p = this.buscar(pedidoId);
    const r = p && asignarRider(p, OTRO_RIDER_ID);
    if (r?.ok) this.guardar(r.pedido);
  }

  private buscar(id: string): Pedido | undefined {
    return this.db.buscarPedido(id);
  }

  private guardar(pedido: Pedido): void {
    this.db.guardarPedido(pedido);
  }

  observar(pedidoId: string): Observable<Pedido | null> {
    return this.pedidos$.pipe(
      map((ps) => ps.find((p) => p.id === pedidoId) ?? null),
      distinctUntilChanged(),
    );
  }

  enCursoDelRider(): Observable<Pedido | null> {
    return this.pedidos$.pipe(
      map((ps) => ps.find((p) => esDelRider(p, RIDER_ACTUAL_ID)) ?? null),
      distinctUntilChanged(),
    );
  }

  ofertaParaRider(): Observable<OfertaPedido | null> {
    return this.oferta$.pipe(distinctUntilChanged());
  }

  aceptarOferta(pedidoId: string): Observable<ResultadoAceptar> {
    const oferta = this.oferta();
    const pedido = this.buscar(pedidoId);
    let resultado: ResultadoAceptar;
    if (!pedido) {
      resultado = { ok: false, motivo: 'no-encontrado' };
    } else if (!oferta || oferta.pedidoId !== pedidoId || oferta.expiraEn.getTime() < Date.now()) {
      resultado = { ok: false, motivo: 'vencida' };
    } else {
      const r = asignarRider(pedido, RIDER_ACTUAL_ID);
      if (r.ok) {
        this.quitarOferta();
        this.guardar(r.pedido);
        resultado = { ok: true, pedido: r.pedido };
      } else {
        resultado = { ok: false, motivo: 'ya-tomado' };
      }
    }
    return of(resultado).pipe(delay(this.latencia));
  }

  rechazarOferta(pedidoId: string): Observable<void> {
    if (this.oferta()?.pedidoId === pedidoId) this.pasarAOtroRider(pedidoId);
    return of(undefined).pipe(delay(this.latencia));
  }

  avanzarEstado(pedidoId: string): Observable<Pedido> {
    const pedido = this.buscar(pedidoId);
    if (!pedido) return throwError(() => new Error('No encontramos el pedido.'));
    const r =
      pedido.estado === 'aceptado'
        ? confirmarRetiro(pedido, 'rider', new Date())
        : pedido.estado === 'retirado'
          ? salirEnCamino(pedido)
          : { ok: false as const, error: 'No se puede avanzar este pedido.' };
    if (!r.ok) return throwError(() => new Error(r.error));
    this.guardar(r.pedido);
    return of(r.pedido).pipe(delay(this.latencia));
  }

  confirmarEntrega(pedidoId: string, pin: string): Observable<ResultadoEntrega> {
    const pedido = this.buscar(pedidoId);
    let resultado: ResultadoEntrega;
    if (!pedido) {
      resultado = { ok: false, motivo: 'no-encontrado' };
    } else if (pedido.estado !== 'en-camino') {
      resultado = { ok: false, motivo: 'estado-invalido' };
    } else {
      const r = entregarConPin(pedido, pin, new Date());
      if (r.ok) {
        this.guardar(r.pedido);
        this.db.descontarComision(r.pedido);
        resultado = { ok: true, pedido: r.pedido };
      } else {
        resultado = { ok: false, motivo: 'pin-incorrecto' };
      }
    }
    return of(resultado).pipe(delay(this.latencia));
  }
}
