import { Observable } from 'rxjs';
import { Kiosco, Producto } from '../models/kiosco';
import { Pedido } from '../models/pedido';
import { DatosPersonales, DireccionEntrega, KioscoReciente, NuevoPedido, RiderPublico, Usuario } from '../models/usuario';
import { Ubicacion, ZonaId } from '../models/zona';
import { EstrellaSumada } from '../rules/premios.rules';

export type ResultadoCrearPedido =
  | { ok: true; pedido: Pedido }
  | { ok: false; motivo: 'kiosco-cerrado' | 'sin-productos' | 'producto-inexistente' | 'pedido-minimo' | 'pedido-en-curso' | 'fuera-de-horario' | 'fuera-de-cobertura' | 'cuenta-pausada' };

/** Operaciones del usuario con sesión iniciada (app FreeDeli). */
export abstract class UsuariosApi {
  abstract perfil(): Observable<Usuario>;
  abstract cambiarDireccion(direccion: DireccionEntrega): Observable<Usuario>;
  /** Falla con el mensaje del servidor si el email ya es de otra cuenta. */
  abstract actualizarDatos(datos: DatosPersonales): Observable<Usuario>;
  /** Kioscos que reciben pedidos ahora, con distancia y envío hasta `desde` (el GPS del cliente). Sin zona, todos. */
  abstract kioscosAbiertos(desde: Ubicacion, zona?: ZonaId): Observable<Kiosco[]>;
  abstract kiosco(id: string, desde: Ubicacion): Observable<Kiosco | null>;
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
  /**
   * Cancela el pedido en cualquier momento antes de la entrega. Si ya transfirió, el kiosco le devuelve
   * el dinero (ver `cancelacion.reintegro`). Tres cancelaciones en una semana pausan la cuenta.
   */
  abstract cancelarPedido(pedidoId: string): Observable<Pedido>;
  /** Pasados 10 minutos sin rider, el cliente elige seguir esperando. */
  abstract seguirEsperando(pedidoId: string): Observable<Pedido>;
  /** FREEDELI RUSH: el cliente jugó 10 minutos seguidos mientras el rider estaba en camino. */
  abstract sumarEstrella(pedidoId: string): Observable<EstrellaSumada>;
}
