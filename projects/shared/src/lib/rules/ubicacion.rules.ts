import { Pedido, PosicionRider } from '../models/pedido.js';
import { distanciaKm } from './pedido.rules.js';

/** Cada cuánto manda su posición el rider mientras lleva un pedido. */
export const SEGUNDOS_REPORTE_RIDER = 15;
/** Una posición más vieja no cuenta: el rider se quedó sin batería o sin señal. */
export const MINUTOS_POSICION_VIGENTE = 2;

type ConPosicion = Pick<Pedido, 'estado' | 'distanciaKm' | 'destino' | 'posicionRider'>;

/** La posición del rider si es de los últimos MINUTOS_POSICION_VIGENTE. */
export function posicionVigente(p: Pick<Pedido, 'posicionRider'>, ahora: Date): PosicionRider | undefined {
  const pos = p.posicionRider;
  return pos && ahora.getTime() - pos.en.getTime() <= MINUTOS_POSICION_VIGENTE * 60_000 ? pos : undefined;
}

/** Km que le faltan al rider en camino hasta el cliente. undefined si no está en camino o no hay posición vigente. */
export function distanciaDelRider(p: ConPosicion, ahora: Date): number | undefined {
  const pos = posicionVigente(p, ahora);
  return p.estado === 'en-camino' && pos ? distanciaKm(pos, p.destino.ubicacion) : undefined;
}

/**
 * El rider en camino ya hizo más de la mitad del viaje del kiosco al cliente.
 * Sin posición vigente es false: la batería y la señal son responsabilidad del rider.
 */
export function riderPasoLaMitad(p: ConPosicion, ahora: Date): boolean {
  const falta = distanciaDelRider(p, ahora);
  return falta !== undefined && falta < p.distanciaKm / 2;
}
