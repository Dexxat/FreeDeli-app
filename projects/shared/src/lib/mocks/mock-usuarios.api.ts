import { DestroyRef, Injectable, InjectionToken, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, delay, distinctUntilChanged, map, of, switchMap, timer } from 'rxjs';
import { ResultadoCrearPedido, UsuariosApi } from '../api/usuarios.api';
import { Kiosco, Producto } from '../models/kiosco';
import { Pedido, cantidadProductos, totalPedido } from '../models/pedido';
import { DireccionEntrega, KioscoReciente, NuevoPedido, RiderPublico, Usuario } from '../models/usuario';
import { ZonaId } from '../models/zona';
import { ESTADOS_ABIERTOS, calcularComision, generarPin } from '../rules/pedido.rules';
import { FREEDELI_CONFIG } from '../config/freedeli.config';
import { MockDb, OTRO_RIDER_ID, USUARIO_ACTUAL_ID } from './mock-db';
import { LATENCIA_MOCK } from './mock-riders.api';

/**
 * Cuánto tarda el rider simulado en cada paso, en ms.
 * Simula que un rider acepta, retira, sale y entrega (como si ingresara el PIN correcto).
 */
export interface SimulacionRider {
  aceptar: number;
  retirar: number;
  salir: number;
  entregar: number;
}

export const SIMULACION_RIDER_MOCK = new InjectionToken<SimulacionRider | null>('SIMULACION_RIDER_MOCK', {
  factory: () => ({ aceptar: 6_000, retirar: 10_000, salir: 8_000, entregar: 25_000 }),
});

const SIGUIENTE: Partial<Record<Pedido['estado'], { estado: Pedido['estado']; paso: keyof SimulacionRider }>> = {
  esperando: { estado: 'aceptado', paso: 'aceptar' },
  aceptado: { estado: 'retirado', paso: 'retirar' },
  retirado: { estado: 'en-camino', paso: 'salir' },
  'en-camino': { estado: 'entregado', paso: 'entregar' },
};

@Injectable()
export class MockUsuariosApi extends UsuariosApi {
  private readonly db = inject(MockDb);
  private readonly latencia = inject(LATENCIA_MOCK);
  private readonly simulacion = inject(SIMULACION_RIDER_MOCK);
  private readonly config = inject(FREEDELI_CONFIG);
  private readonly pedidos$ = toObservable(this.db.pedidos);

  private readonly abierto = computed(
    () => this.db.pedidos().find((p) => p.usuarioId === USUARIO_ACTUAL_ID && ESTADOS_ABIERTOS.includes(p.estado)) ?? null,
  );

  constructor() {
    super();
    const sim = this.simulacion;
    if (!sim) return;
    // Rider simulado: avanza un paso del pedido abierto cada cierto tiempo.
    const sub = toObservable(this.abierto)
      .pipe(
        distinctUntilChanged((a, b) => a?.id === b?.id && a?.estado === b?.estado),
        switchMap((p) => {
          const sig = p && SIGUIENTE[p.estado];
          return p && sig ? timer(sim[sig.paso]).pipe(map(() => ({ id: p.id, estado: sig.estado }))) : EMPTY;
        }),
      )
      .subscribe(({ id, estado }) => this.avanzar(id, estado));
    inject(DestroyRef).onDestroy(() => sub.unsubscribe());
  }

  private avanzar(id: string, estado: Pedido['estado']): void {
    const ahora = new Date();
    this.db.pedidos.update((ps) =>
      ps.map((p) =>
        p.id !== id
          ? p
          : {
              ...p,
              estado,
              riderId: p.riderId ?? OTRO_RIDER_ID,
              aceptadoEn: estado === 'aceptado' ? ahora : p.aceptadoEn,
              entregadoEn: estado === 'entregado' ? ahora : p.entregadoEn,
              // El kiosco simulado confirma la transferencia cuando un rider acepta.
              pago: estado === 'entregado' ? 'liberado' : estado === 'aceptado' ? 'transferido' : p.pago,
            },
      ),
    );
  }

  private usuario(): Usuario {
    return this.db.usuarios().find((u) => u.id === USUARIO_ACTUAL_ID)!;
  }

  private responder<T>(valor: T): Observable<T> {
    return of(valor).pipe(delay(this.latencia));
  }

  perfil(): Observable<Usuario> {
    return this.responder(this.usuario());
  }

  cambiarDireccion(direccion: DireccionEntrega): Observable<Usuario> {
    this.db.usuarios.update((us) => us.map((u) => (u.id === USUARIO_ACTUAL_ID ? { ...u, direccion: { ...direccion } } : u)));
    return this.responder(this.usuario());
  }

  kioscosAbiertos(zona?: ZonaId): Observable<Kiosco[]> {
    return this.responder(this.db.kioscos().filter((k) => k.abierto && !k.pausado && (!zona || k.zona === zona)));
  }

  kiosco(id: string): Observable<Kiosco | null> {
    return this.responder(this.db.kioscos().find((k) => k.id === id) ?? null);
  }

  productos(kioscoId: string): Observable<Producto[]> {
    return this.responder(this.db.productos().filter((p) => p.kioscoId === kioscoId));
  }

  crearPedido(nuevo: NuevoPedido): Observable<ResultadoCrearPedido> {
    const kiosco = this.db.kioscos().find((k) => k.id === nuevo.kioscoId);
    const catalogo = this.db.productos().filter((p) => p.kioscoId === nuevo.kioscoId);
    const lineas = nuevo.items.filter((i) => Number.isInteger(i.cantidad) && i.cantidad > 0);

    let resultado: ResultadoCrearPedido;
    if (!kiosco || !kiosco.abierto || kiosco.pausado) {
      resultado = { ok: false, motivo: 'kiosco-cerrado' };
    } else if (lineas.length === 0) {
      resultado = { ok: false, motivo: 'sin-productos' };
    } else if (lineas.some((i) => !catalogo.some((p) => p.id === i.productoId))) {
      resultado = { ok: false, motivo: 'producto-inexistente' };
    } else if (this.abierto()) {
      resultado = { ok: false, motivo: 'pedido-en-curso' };
    } else {
      const u = this.usuario();
      const subtotal = lineas.reduce((a, i) => a + i.cantidad * catalogo.find((p) => p.id === i.productoId)!.precio, 0);
      const numero = Math.max(999, ...this.db.pedidos().map((p) => p.numero)) + 1;
      const pedido: Pedido = {
        id: `ped-${numero}`,
        numero,
        zona: kiosco.zona,
        kioscoId: kiosco.id,
        kioscoNombre: kiosco.nombre,
        kioscoDireccion: kiosco.direccion,
        usuarioId: u.id,
        destino: { nombre: u.nombreCorto, direccion: u.direccion.direccion, notas: u.direccion.notas },
        items: lineas.map((i) => {
          const prod = catalogo.find((p) => p.id === i.productoId)!;
          return { productoId: prod.id, nombre: prod.nombre, cantidad: i.cantidad, precioUnitario: prod.precio };
        }),
        costoEnvio: kiosco.costoEnvio,
        propina: 0,
        gananciaRider: kiosco.costoEnvio,
        // El cliente transfiere al alias del kiosco; queda pendiente hasta que el kiosco lo confirme.
        pago: 'pendiente',
        aliasKiosco: kiosco.aliasCobro,
        comisionFreeDeli: calcularComision(subtotal, this.config.comisionPorcentaje),
        pin: generarPin(),
        estado: 'esperando',
        creadoEn: new Date(),
      };
      this.db.pedidos.update((ps) => [...ps, pedido]);
      resultado = { ok: true, pedido };
    }
    return this.responder(resultado);
  }

  pedidoEnCurso(): Observable<Pedido | null> {
    return this.pedidos$.pipe(
      map((ps) => ps.find((p) => p.usuarioId === USUARIO_ACTUAL_ID && ESTADOS_ABIERTOS.includes(p.estado)) ?? null),
      distinctUntilChanged(),
    );
  }

  pedido(id: string): Observable<Pedido | null> {
    return this.pedidos$.pipe(
      map((ps) => ps.find((p) => p.id === id && p.usuarioId === USUARIO_ACTUAL_ID) ?? null),
      distinctUntilChanged(),
    );
  }

  recientes(limite = 3): Observable<KioscoReciente[]> {
    const entregados = this.db
      .pedidos()
      .filter((p) => p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'entregado')
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
    const vistos = new Set<string>();
    const lista: KioscoReciente[] = [];
    for (const p of entregados) {
      const kiosco = this.db.kioscos().find((k) => k.id === p.kioscoId);
      if (!kiosco || vistos.has(kiosco.id)) continue;
      vistos.add(kiosco.id);
      lista.push({ kiosco, pedidoId: p.id, fecha: p.creadoEn, cantidadProductos: cantidadProductos(p), total: totalPedido(p) });
      if (lista.length === limite) break;
    }
    return this.responder(lista);
  }

  riderAsignado(pedidoId: string): Observable<RiderPublico | null> {
    const p = this.db.pedidos().find((x) => x.id === pedidoId);
    const r = p?.riderId ? this.db.riders().find((x) => x.id === p.riderId) : undefined;
    if (!r) return this.responder(null);
    const [nombre, apellido] = r.nombre.split(' ');
    return this.responder({ nombre: apellido ? `${nombre} ${apellido[0]}.` : nombre, vehiculo: r.vehiculo.modelo, patente: r.vehiculo.patente });
  }
}
