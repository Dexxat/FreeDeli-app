import { Observable } from 'rxjs';
import { Kiosco } from '../models/kiosco';
import { Pedido } from '../models/pedido';
import { RiderPublico } from '../models/usuario';

/** Operaciones del kiosco con sesión iniciada (app FreeDeli Kioscos). */
export abstract class KioscosApi {
  /** El kiosco, con su saldo prepago. Emite en cada cambio. */
  abstract kiosco(): Observable<Kiosco>;
  /** Pedidos abiertos del kiosco, del más viejo al más nuevo. Emite en cada cambio. */
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
}
