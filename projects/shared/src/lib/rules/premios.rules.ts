import { Pedido } from '../models/pedido.js';

/**
 * FREEDELI RUSH: mientras el rider está en camino, el cliente puede jugar.
 * Cada 10 minutos de juego seguidos suma una estrella (una por pedido);
 * con 5 estrellas gana $2.500 de saldo a favor, que sale de la ganancia de FreeDeli.
 */
export const MINUTOS_PARA_ESTRELLA = 10;
export const ESTRELLAS_PARA_PREMIO = 5;
export const PREMIO_SALDO = 2500;
/** La estrella se puede reclamar hasta este tiempo después de la entrega (el rider llegó justo). */
export const MS_TOLERANCIA_TRAS_ENTREGA = 2 * 60_000;

export type ResultadoEstrella = { ok: true } | { ok: false; error: string };

/**
 * Si el cliente puede sumar la estrella de este pedido ahora. El servidor no confía en el reloj
 * del teléfono: el pedido tiene que llevar al menos 10 minutos en camino.
 */
export function puedeGanarEstrella(p: Pick<Pedido, 'estado' | 'enCaminoEn' | 'entregadoEn' | 'estrellaGanada'>, ahora: Date): ResultadoEstrella {
  if (p.estrellaGanada) return { ok: false, error: 'Ya sumaste la estrella de este pedido.' };
  if (!p.enCaminoEn) return { ok: false, error: 'El juego empieza cuando el rider sale en camino.' };
  const recienEntregado = p.estado === 'entregado' && !!p.entregadoEn && ahora.getTime() - p.entregadoEn.getTime() <= MS_TOLERANCIA_TRAS_ENTREGA;
  if (p.estado !== 'en-camino' && !recienEntregado) return { ok: false, error: 'El juego terminó con la entrega.' };
  if (ahora.getTime() - p.enCaminoEn.getTime() < MINUTOS_PARA_ESTRELLA * 60_000) {
    return { ok: false, error: `Hay que jugar ${MINUTOS_PARA_ESTRELLA} minutos seguidos.` };
  }
  return { ok: true };
}

export interface CuentaPremios {
  estrellas: number;
  saldoFavor: number;
}

/** Cómo quedó la cuenta después de sumar una estrella. */
export type EstrellaSumada = CuentaPremios & { premio: boolean };

/** Suma una estrella. Al llegar a 5, se canjean por el premio y vuelven a 0. */
export function sumarEstrella(c: CuentaPremios): EstrellaSumada {
  const estrellas = c.estrellas + 1;
  if (estrellas < ESTRELLAS_PARA_PREMIO) return { estrellas, saldoFavor: c.saldoFavor, premio: false };
  return { estrellas: estrellas - ESTRELLAS_PARA_PREMIO, saldoFavor: c.saldoFavor + PREMIO_SALDO, premio: true };
}

/** Cuánto saldo a favor se usa en un pedido: todo lo disponible, sin pasarse de lo que cuesta. */
export function descuentoAplicable(saldoFavor: number, totalSinDescuento: number): number {
  return Math.max(0, Math.min(saldoFavor, totalSinDescuento));
}

/** Lo que gana FreeDeli con un pedido entregado: la comisión menos el premio que pagó. */
export function gananciaFreeDeli(p: Pick<Pedido, 'comisionFreeDeli' | 'descuentoPremio'>): number {
  return p.comisionFreeDeli - (p.descuentoPremio ?? 0);
}
