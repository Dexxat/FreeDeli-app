import { Observable } from 'rxjs';
import { Kiosco, Producto } from '../models/kiosco';
import { Pedido } from '../models/pedido';
import { DireccionEntrega, KioscoReciente, NuevoPedido, RiderPublico, Usuario } from '../models/usuario';
import { ZonaId } from '../models/zona';

export type ResultadoCrearPedido =
  | { ok: true; pedido: Pedido }
  | { ok: false; motivo: 'kiosco-cerrado' | 'sin-productos' | 'producto-inexistente' | 'pedido-minimo' | 'pedido-en-curso' | 'fuera-de-horario' };

/** Operaciones del usuario con sesión iniciada (app FreeDeli). */
export abstract class UsuariosApi {
  abstract perfil(): Observable<Usuario>;
  abstract cambiarDireccion(direccion: DireccionEntrega): Observable<Usuario>;
  /** Kioscos abiertos y no pausados. Sin zona, todos. */
  abstract kioscosAbiertos(zona?: ZonaId): Observable<Kiosco[]>;
  abstract kiosco(id: string): Observable<Kiosco | null>;
  abstract productos(kioscoId: string): Observable<Producto[]>;
  /** Crea el pedido con los precios del catálogo y un PIN nuevo. Queda esperando rider. */
  abstract crearPedido(nuevo: NuevoPedido): Observable<ResultadoCrearPedido>;
  /** Pedido abierto del usuario (esperando, aceptado, retirado o en camino), o null. Emite en cada cambio. */
  abstract pedidoEnCurso(): Observable<Pedido | null>;
  /** Un pedido del usuario. Emite en cada cambio. */
  abstract pedido(id: string): Observable<Pedido | null>;
  /** Último pedido entregado en cada kiosco, del más reciente al más viejo. */
  abstract recientes(limite?: number): Observable<KioscoReciente[]>;
  abstract riderAsignado(pedidoId: string): Observable<RiderPublico | null>;
  /** Acepta el pedido ajustado por falta de stock. */
  abstract aceptarAjuste(pedidoId: string): Observable<Pedido>;
  /** Cancela el pedido. Solo antes de que se busque rider. */
  abstract cancelarPedido(pedidoId: string): Observable<Pedido>;
}
