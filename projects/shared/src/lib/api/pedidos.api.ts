import { Observable } from 'rxjs';
import { OfertaPedido, Pedido } from '../models/pedido';
import { Ubicacion } from '../models/zona';

export type ResultadoAceptar =
  | { ok: true; pedido: Pedido }
  | { ok: false; motivo: 'vencida' | 'ya-tomado' | 'no-encontrado' };

export type ResultadoEntrega =
  | { ok: true; pedido: Pedido }
  | { ok: false; motivo: 'pin-incorrecto' | 'estado-invalido' | 'no-encontrado' };

/** Pedidos compartidos entre las apps. El estado se ve igual en Usuarios y Riders. */
export abstract class PedidosApi {
  /** Emite cada vez que el pedido cambia. Empieza por el último estado conocido. */
  abstract observar(pedidoId: string): Observable<Pedido | null>;
  /** Pedido del rider con sesión iniciada (esperando aprobación del kiosco o en curso), o null. Emite en cada cambio. */
  abstract enCursoDelRider(): Observable<Pedido | null>;
  /**
   * Paso del rider: en Aceptado confirma el retiro (pasa a Retirado cuando también confirma el kiosco);
   * en Retirado sale en camino. No pasa a Entregado: para eso está confirmarEntrega.
   */
  abstract avanzarEstado(pedidoId: string): Observable<Pedido>;
  /**
   * Pedido nuevo ofrecido al rider con sesión iniciada, o null. Emite en cada cambio.
   * Solo hay ofertas si el rider está ON, no está pausado y no tiene un pedido en curso.
   */
  abstract ofertaParaRider(): Observable<OfertaPedido | null>;
  abstract aceptarOferta(pedidoId: string): Observable<ResultadoAceptar>;
  /** Rechazar no tiene castigo: el pedido se ofrece a otro rider. */
  abstract rechazarOferta(pedidoId: string): Observable<void>;
  /** El GPS del rider manda su posición mientras lleva el pedido: el cliente ve cuánto le falta. */
  abstract reportarPosicion(pedidoId: string, ubicacion: Ubicacion): Observable<void>;
  /** Si el PIN coincide, el pedido pasa a Entregado en las dos apps. */
  abstract confirmarEntrega(pedidoId: string, pin: string): Observable<ResultadoEntrega>;
}
