import { Pedido, totalPedido } from '../models/pedido.js';

/** Minutos buscando rider tras los que se le pregunta al cliente si sigue esperando. */
export const MINUTOS_SIN_RIDER = 10;
/** Cancelaciones del cliente en una semana que pausan su cuenta hasta que Dev la reactive. */
export const CANCELACIONES_PARA_PAUSA = 3;
export const DIAS_CANCELACIONES = 7;
/** Pedidos abandonados por un rider que lo pausan hasta que Dev lo evalúe. */
export const ABANDONOS_PARA_PAUSA = 3;

const MS_DIA = 24 * 60 * 60_000;

/** El pedido lleva MINUTOS_SIN_RIDER buscando rider sin que ninguno lo tome. */
export function esperaSinRider(p: Pick<Pedido, 'estado' | 'fase' | 'buscandoRiderDesde'>, ahora: Date): boolean {
  if (p.estado !== 'esperando' || p.fase !== 'rider' || !p.buscandoRiderDesde) return false;
  return ahora.getTime() - p.buscandoRiderDesde.getTime() >= MINUTOS_SIN_RIDER * 60_000;
}

/** Si el cliente ya transfirió, se le devuelve todo, salvo el envío cuando el rider cobra el viaje. */
export function reintegroAlCancelar(p: Pick<Pedido, 'pago' | 'items' | 'costoEnvio' | 'descuentoPremio'>, riderCobra: boolean): number {
  if (p.pago !== 'transferido') return 0;
  return Math.max(0, totalPedido(p) - (riderCobra ? p.costoEnvio : 0));
}

/** Las cancelaciones del cliente cuentan durante una semana, y solo desde que Dev lo reactivó. */
export function inicioConteoCancelaciones(ahora: Date, habilitadoEn: Date): Date {
  const semana = new Date(ahora.getTime() - DIAS_CANCELACIONES * MS_DIA);
  return habilitadoEn > semana ? habilitadoEn : semana;
}

/** Pedido cancelado en el que el kiosco todavía tiene que devolver dinero al cliente. */
export function reintegroPendiente(p: Pick<Pedido, 'estado' | 'cancelacion'>): boolean {
  return p.estado === 'cancelado' && !!p.cancelacion && p.cancelacion.reintegro > 0 && !p.cancelacion.reintegradoEn;
}
