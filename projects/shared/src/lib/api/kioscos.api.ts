import { Observable } from 'rxjs';
import { DatosKiosco, GananciasKiosco, MovimientoSaldo, PeriodoAdmin } from '../models/admin';
import { Kiosco, Producto } from '../models/kiosco';
import { PeriodoHistorial } from '../models/rider';
import { Pedido } from '../models/pedido';
import { RiderPublico } from '../models/usuario';

/** Operaciones del kiosco con sesión iniciada (app FreeDeli Kioscos). */
export abstract class KioscosApi {
  /** El kiosco, con su saldo prepago. Emite en cada cambio. */
  abstract kiosco(): Observable<Kiosco>;
  /** Pedidos abiertos del kiosco y cancelados con dinero por devolver, del más viejo al más nuevo. Emite en cada cambio. */
  abstract pedidosEnVivo(): Observable<Pedido[]>;
  /** Datos del rider que aceptó o lleva el pedido. */
  abstract rider(riderId: string): Observable<RiderPublico | null>;
  /** Confirma el stock. Los productos de `faltantes` se quitan y el cliente decide. */
  abstract confirmarStock(pedidoId: string, faltantes: string[]): Observable<Pedido>;
  /** El kiosco revisó su cuenta y recibió la transferencia del cliente. */
  abstract confirmarTransferencia(pedidoId: string): Observable<Pedido>;
  /** Aprueba o rechaza al rider que aceptó el pedido. */
  abstract aprobarRider(pedidoId: string, aprobado: boolean): Observable<Pedido>;
  /** El kiosco le entregó el pedido al rider ("Confirmar envío"). */
  abstract confirmarEnvio(pedidoId: string): Observable<Pedido>;
  /** El kiosco le devolvió al cliente el dinero de un pedido cancelado. */
  abstract marcarReintegrado(pedidoId: string): Observable<Pedido>;

  /** Pedidos terminados (entregados y cancelados), del más nuevo al más viejo. */
  abstract historial(periodo: PeriodoHistorial): Observable<Pedido[]>;
  abstract ganancias(periodo: PeriodoAdmin): Observable<GananciasKiosco>;
  abstract actualizarDatos(datos: DatosKiosco): Observable<Kiosco>;
  /** Cargas y comisiones del saldo prepago. Emite en cada cambio. */
  abstract movimientosSaldo(): Observable<MovimientoSaldo[]>;
  /** Todo el catálogo, incluidos los productos sin stock. Emite en cada cambio. */
  abstract catalogo(): Observable<Producto[]>;
  /** Crea (sin id) o modifica un producto. */
  abstract guardarProducto(producto: Omit<Producto, 'id' | 'kioscoId'> & { id?: string }): Observable<Producto>;
}
