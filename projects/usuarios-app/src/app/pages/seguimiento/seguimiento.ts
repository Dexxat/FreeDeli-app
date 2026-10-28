import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  BarraEstado,
  FREEDELI_CONFIG,
  PREMIO_SALDO,
  PesosPipe,
  UsuariosApi,
  mensajeDeError,
  codigoPedido,
  distanciaDelRider,
  formatearPesos,
  reintegroPendiente,
  linkWhatsApp,
  minutosParaLlegar,
  totalPedido,
} from '@freedeli/shared';
import { PasoActual } from '../../ui/paso-actual';
import { Rush } from '../../ui/rush/rush';
import { Estrellas } from '../../ui/estrellas';
import { UsuarioStore } from '../../core/usuario.store';
import { distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { Reloj } from '../../core/reloj';
import { CancelarPedido } from '../../ui/cancelar-pedido';
import { formatearKm } from '../kioscos/kioscos';

const HORA = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

@Component({
  selector: 'fd-seguimiento',
  imports: [BarraEstado, PesosPipe, RouterLink, PasoActual, Rush, Estrellas, CancelarPedido],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seguimiento.html',
  styleUrl: './seguimiento.scss',
})
export default class Seguimiento {
  private readonly api = inject(UsuariosApi);
  private readonly config = inject(FREEDELI_CONFIG);
  protected readonly store = inject(UsuarioStore);
  protected readonly premio = PREMIO_SALDO;
  /** Resultado de reclamar la estrella de este pedido. */
  protected readonly estrella = signal<{ sumada: boolean; premio: boolean; error?: string } | null>(null);

  /** Sin id (pestaña MI PEDIDO) se muestra el pedido en curso. */
  readonly pedidoId = input<string | undefined>(undefined);

  /** undefined mientras carga; null si no hay pedido. */
  protected readonly pedido = toSignal(
    toObservable(this.pedidoId).pipe(switchMap((id) => (id ? this.api.pedido(id) : this.seguirEnCurso()))),
  );

  /**
   * Sigue al pedido en curso por su id, así al entregarse se ve la confirmación
   * en lugar de "no tenés pedidos" (al entregarse deja de estar en curso).
   */
  private seguirEnCurso() {
    let ultimo: string | null = null;
    return this.api.pedidoEnCurso().pipe(
      map((p) => (ultimo = p?.id ?? ultimo)),
      distinctUntilChanged(),
      switchMap((id) => (id ? this.api.pedido(id) : of(null))),
    );
  }

  /** Para el tiempo estimado del kiosco. Se pide una vez por pedido, aunque el pedido cambie. */
  private readonly kiosco = toSignal(
    toObservable(
      computed(
        () => {
          const p = this.pedido();
          return p ? { id: p.kioscoId, desde: p.destino.ubicacion } : null;
        },
        { equal: (a, b) => a?.id === b?.id },
      ),
    ).pipe(switchMap((k) => (k ? this.api.kiosco(k.id, k.desde) : of(null)))),
  );

  /** Se vuelve a pedir cuando cambia el rider o el estado (aparece al aceptar). */
  protected readonly rider = toSignal(
    toObservable(computed(() => {
      const p = this.pedido();
      return p ? `${p.id}|${p.riderId ?? ''}|${p.estado}` : null;
    })).pipe(switchMap((clave) => (clave ? this.api.riderAsignado(clave.split('|')[0]) : of(null)))),
  );

  private readonly reloj = inject(Reloj);

  /** "1,2 km": cuánto le falta al rider en camino, según su GPS. */
  protected readonly distanciaRider = computed(() => {
    const p = this.pedido();
    const km = p ? distanciaDelRider(p, this.reloj.ahora()) : undefined;
    return km === undefined ? null : formatearKm(km);
  });

  protected readonly minutos = computed(() => {
    const p = this.pedido();
    const k = this.kiosco();
    return p && k ? minutosParaLlegar(p, k.tiempoEstimadoMin, this.reloj.ahora()) : null;
  });

  /** Qué le pasó al dinero de un pedido cancelado. */
  protected readonly textoCancelado = computed(() => {
    const c = this.pedido()?.cancelacion;
    if (!c?.reintegro) return 'No se cobró nada. Podés pedir en otro kiosco.';
    const envio = c.riderCobra ? ' El rider ya había hecho más de la mitad del viaje: el envío no se devuelve.' : '';
    if (c.reintegradoEn) return `El kiosco ya te devolvió ${formatearPesos(c.reintegro)}.${envio}`;
    return `El kiosco te devuelve ${formatearPesos(c.reintegro)} a la cuenta desde la que transferiste.${envio}`;
  });
  protected readonly motivoCancelado = computed(() => {
    const motivo = this.pedido()?.cancelacion?.motivo;
    if (motivo === 'rider') return 'El rider no pudo llevar tu pedido.';
    if (motivo === 'sin-stock') return 'Al kiosco no le quedaba ninguno de los productos.';
    if (motivo === 'dev') return 'FreeDeli canceló el pedido.';
    return null;
  });

  protected readonly digitos = computed(() => [...(this.pedido()?.pin ?? '')]);
  protected readonly codigo = codigoPedido;
  protected readonly reintegroPendiente = reintegroPendiente;
  protected readonly total = totalPedido;
  protected readonly hora = (d?: Date) => (d ? HORA.format(d) : '');

  protected sumarEstrella(pedidoId: string): void {
    this.api.sumarEstrella(pedidoId).subscribe({
      next: (r) => {
        this.store.actualizarPremios(r);
        this.estrella.set({ sumada: true, premio: r.premio });
      },
      error: (e: unknown) => this.estrella.set({ sumada: false, premio: false, error: mensajeDeError(e, e instanceof Error ? e.message : undefined) }),
    });
  }

  protected readonly whatsapp = computed(() => {
    const p = this.pedido();
    return linkWhatsApp(this.config.whatsapp, p ? `Hola FreeDeli, te escribo por mi pedido ${codigoPedido(p)}.` : undefined);
  });
}
