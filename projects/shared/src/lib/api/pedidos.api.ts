import { Observable } from 'rxjs';
import { Pedido } from '../models/pedido';

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
  /** Si el PIN coincide, el pedido pasa a Entregado en las dos apps. */
  abstract confirmarEntrega(pedidoId: string, pin: string): Observable<ResultadoEntrega>;
}
