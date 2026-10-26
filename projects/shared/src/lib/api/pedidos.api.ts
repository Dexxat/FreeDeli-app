import { Observable } from 'rxjs';
import { OfertaPedido, Pedido } from '../models/pedido';

export type ResultadoAceptar =
  | { ok: true; pedido: Pedido }
  | { ok: false; motivo: 'vencida' | 'ya-tomado' | 'no-encontrado' };

export type ResultadoEntrega =
  | { ok: true; pedido: Pedido }
  | { ok: false; motivo: 'pin-incorrecto' | 'estado-invalido' | 'no-encontrado' };

/** Pedidos compartidos entre las apps. El estado se ve igual en Usuarios y Riders. */
export abstract class PedidosApi {
  /** Emite cada vez que el pedido cambia. */
  abstract observar(pedidoId: string): Observable<Pedido | null>;
  /** Pedido en curso del rider con sesión iniciada, o null. Emite en cada cambio. */
  abstract enCursoDelRider(): Observable<Pedido | null>;
  /** Aceptado → Retirado → En camino. No pasa a Entregado: para eso está confirmarEntrega. */
  abstract avanzarEstado(pedidoId: string): Observable<Pedido>;
  /**
   * Pedido nuevo ofrecido al rider con sesión iniciada, o null. Emite en cada cambio.
   * Solo hay ofertas si el rider está ON, no está pausado y no tiene un pedido en curso.
   */
  abstract ofertaParaRider(): Observable<OfertaPedido | null>;
  abstract aceptarOferta(pedidoId: string): Observable<ResultadoAceptar>;
  /** Rechazar no tiene castigo: el pedido se ofrece a otro rider. */
  abstract rechazarOferta(pedidoId: string): Observable<void>;
  /** Si el PIN coincide, el pedido pasa a Entregado en las dos apps. */
  abstract confirmarEntrega(pedidoId: string, pin: string): Observable<ResultadoEntrega>;
}
