import { DestroyRef, Injectable, InjectionToken, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { FREEDELI_CONFIG } from '../config/freedeli.config';
import { Pedido } from '../models/pedido';
import {
  Resultado,
  aceptarAjuste,
  aprobarRider,
  asignarRider,
  confirmarRetiro,
  confirmarStock,
  confirmarTransferencia,
  entregarConPin,
  salirEnCamino,
} from '../rules/flujo.rules';
import { ESTADOS_ABIERTOS } from '../rules/pedido.rules';
import { KIOSCO_ACTUAL_ID, MockDb, OTRO_RIDER_ID, RIDER_ACTUAL_ID } from './mock-db';

/**
 * Qué partes simula el mock. Cada app activa las que no maneja una persona:
 * - `cliente`: acepta los ajustes de stock.
 * - `kiosco`: confirma stock, transferencia, aprueba riders y confirma envíos.
 * - `rider`: toma pedidos, confirma retiro, sale y entrega.
 * - `pedidosNuevos`: llegan pedidos de clientes al kiosco actual.
 */
export interface ActoresSimulados {
  cliente: boolean;
  kiosco: boolean;
  rider: boolean;
  pedidosNuevos: boolean;
}

export interface DemorasSimulacion {
  /** ms que tarda cada actor en hacer su paso. */
  paso: number;
  /** ms entre pedidos nuevos de clientes. */
  pedidoNuevo: number;
}

export const ACTORES_SIMULADOS = new InjectionToken<ActoresSimulados>('ACTORES_SIMULADOS', {
  factory: () => ({ cliente: false, kiosco: false, rider: false, pedidosNuevos: false }),
});

export const DEMORAS_SIMULACION = new InjectionToken<DemorasSimulacion>('DEMORAS_SIMULACION', {
  factory: () => ({ paso: 7_000, pedidoNuevo: 45_000 }),
});

/** Máximo de pedidos abiertos en el kiosco actual para seguir generando nuevos. */
const MAX_ABIERTOS = 3;

@Injectable()
export class MockSimulador {
  private readonly db = inject(MockDb);
  private readonly actores = inject(ACTORES_SIMULADOS);
  private readonly demoras = inject(DEMORAS_SIMULACION);
  private readonly config = inject(FREEDELI_CONFIG);
  private readonly programados = new Map<string, ReturnType<typeof setTimeout>>();

  constructor() {
    const sub = toObservable(this.db.pedidos).subscribe((ps) => this.revisar(ps));
    let generador: ReturnType<typeof setInterval> | undefined;
    if (this.actores.pedidosNuevos) {
      generador = setInterval(() => this.pedidoNuevo(), this.demoras.pedidoNuevo);
    }
    inject(DestroyRef).onDestroy(() => {
      sub.unsubscribe();
      if (generador) clearInterval(generador);
      this.programados.forEach((t) => clearTimeout(t));
    });
  }

  private pedidoNuevo(): void {
    const abiertos = this.db.pedidos().filter((p) => p.kioscoId === KIOSCO_ACTUAL_ID && ESTADOS_ABIERTOS.includes(p.estado));
    if (abiertos.length < MAX_ABIERTOS) this.db.crearPedidoDeCliente(KIOSCO_ACTUAL_ID);
  }

  /** Clave del momento del pedido: si cambia, el paso programado ya no corresponde. */
  private clave(p: Pedido): string {
    return [p.id, p.estado, p.fase ?? '', p.riderId ?? '', p.retiro?.kiosco ? 'k' : '', p.retiro?.rider ? 'r' : ''].join('|');
  }

  private revisar(pedidos: Pedido[]): void {
    const vigentes = new Set<string>();
    for (const p of pedidos) {
      const paso = this.pasoSimulado(p);
      if (!paso) continue;
      const clave = this.clave(p);
      vigentes.add(clave);
      if (this.programados.has(clave)) continue;
      const t = setTimeout(() => {
        this.programados.delete(clave);
        const actual = this.db.buscarPedido(p.id);
        if (!actual || this.clave(actual) !== clave) return;
        const r = paso(actual);
        if (!r.ok) return;
        this.db.guardarPedido(r.pedido);
        if (r.pedido.estado === 'entregado') this.db.liquidar(r.pedido);
      }, this.demoras.paso);
      this.programados.set(clave, t);
    }
    for (const [clave, t] of this.programados) {
      if (!vigentes.has(clave)) {
        clearTimeout(t);
        this.programados.delete(clave);
      }
    }
  }

  /** El paso que haría un actor simulado con este pedido, o null si le toca a una persona. */
  private pasoSimulado(p: Pedido): ((p: Pedido) => Resultado) | null {
    const { cliente, kiosco, rider } = this.actores;
    const ahora = () => new Date();
    if (p.estado === 'esperando') {
      switch (p.fase) {
        case 'stock':
          return kiosco ? (x) => confirmarStock(x, [], this.config.comisionPorcentaje) : null;
        case 'ajuste':
          return cliente ? aceptarAjuste : null;
        case 'transferencia':
          return kiosco ? confirmarTransferencia : null;
        case 'rider': {
          // Las ofertas para el rider real las maneja su app; acá toman los riders simulados.
          if (!rider) return null;
          const candidato = [OTRO_RIDER_ID, RIDER_ACTUAL_ID].find((id) => !p.ridersRechazados?.includes(id));
          return candidato ? (x) => asignarRider(x, candidato) : null;
        }
        case 'aprobacion':
          return kiosco ? (x) => aprobarRider(x, true, ahora()) : null;
        default:
          return null;
      }
    }
    if (p.estado === 'aceptado') {
      if (kiosco && !p.retiro?.kiosco) return (x) => confirmarRetiro(x, 'kiosco', ahora());
      if (rider && !p.retiro?.rider) return (x) => confirmarRetiro(x, 'rider', ahora());
      return null;
    }
    if (p.estado === 'retirado') return rider ? (x) => salirEnCamino(x, ahora()) : null;
    if (p.estado === 'en-camino') return rider ? (x) => entregarConPin(x, x.pin, ahora()) : null;
    return null;
  }
}
