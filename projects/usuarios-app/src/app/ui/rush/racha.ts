/**
 * Cuánto lleva jugando seguido el cliente: el tiempo desde que arrancó, contando los reintentos.
 * Si después de chocar pasa más del respiro sin volver a jugar, o sale de la pantalla, vuelve a 0.
 */
export const MS_RESPIRO_ENTRE_PARTIDAS = 20_000;

export interface Racha {
  ms: number;
  /** Desde cuándo no está jugando (null mientras juega). */
  quietoDesde: number | null;
}

export const RACHA_VACIA: Racha = { ms: 0, quietoDesde: null };

/** Actualiza la racha tras `dt` ms, sabiendo si la partida estaba corriendo. */
export function avanzarRacha(r: Racha, dt: number, jugando: boolean, ahora: number): Racha {
  if (jugando) return { ms: r.ms + dt, quietoDesde: null };
  if (r.ms === 0) return r;
  const quietoDesde = r.quietoDesde ?? ahora;
  return ahora - quietoDesde > MS_RESPIRO_ENTRE_PARTIDAS ? RACHA_VACIA : { ms: r.ms + dt, quietoDesde };
}

/** 192_000 → "3:12". */
export function formatoRacha(ms: number): string {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
