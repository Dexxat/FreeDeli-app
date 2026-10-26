import { Injectable } from '@nestjs/common';
import { Subject } from 'rxjs';
import type { OfertaPedido, Pedido } from '../dominio.js';

/** Algo cambió. Las apps lo reciben por /api/eventos (Server-Sent Events). */
export type Evento =
  | { tipo: 'pedido'; pedido: Pedido }
  | { tipo: 'oferta'; riderId: string; oferta: OfertaPedido | null }
  /** Alta nueva de kiosco o rider: solo le llega a Dev. */
  | { tipo: 'alta'; cuentaId: string };

@Injectable()
export class EventosService {
  readonly flujo$ = new Subject<Evento>();

  emitir(evento: Evento): void {
    this.flujo$.next(evento);
  }
}
