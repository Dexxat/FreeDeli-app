import { MovimientoKiosco } from '../models/admin.js';
import { Pedido, totalPedido } from '../models/pedido.js';
import { aporteKioscoEnvio } from './pedido.rules.js';

/** Debajo de este saldo, el kiosco se marca en alerta. */
export const SALDO_BAJO = 10_000;

/** Minutos esperando rider a partir de los cuales un pedido se marca demorado. */
export const MINUTOS_DEMORA = 10;

/**
 * El dinero de un pedido: el cliente transfiere productos + su parte del envío al kiosco,
 * y el kiosco transfiere el envío completo al rider y la comisión a FreeDeli.
 * Si el viaje supera el tope del cliente, la diferencia sale del kiosco.
 * Un pedido cancelado no mueve dinero.
 */
export function movimientoDePedido(p: Pedido): MovimientoKiosco {
  const cancelado = p.estado === 'cancelado';
  const totalCliente = cancelado ? 0 : totalPedido(p);
  const envioRider = cancelado ? 0 : p.gananciaRider + p.propina;
  const comisionFreeDeli = cancelado ? 0 : p.comisionFreeDeli;
  return {
    pedidoId: p.id,
    numero: p.numero,
    fecha: p.creadoEn,
    estado: p.estado,
    pago: p.pago,
    totalCliente,
    envioRider,
    aporteEnvio: cancelado ? 0 : aporteKioscoEnvio(p),
    comisionFreeDeli,
    netoKiosco: totalCliente - envioRider - comisionFreeDeli,
  };
}
