import { MINUTOS_PARA_ESTRELLA } from '@freedeli/shared';
import { EstadoJuego, MS_POR_PASO, estadoInicial, paso, saltar } from './motor';
import { RACHA_VACIA, Racha, avanzarRacha } from './racha';

export const MS_PARA_ESTRELLA = MINUTOS_PARA_ESTRELLA * 60_000;
/**
 * La racha mide tiempo de reloj, no pasos: el teléfono puede frenar los temporizadores.
 * Un salto más largo que esto (pantalla bloqueada, app en segundo plano) no cuenta como jugado.
 */
const MAX_MS_ENTRE_PASOS = 5_000;

/** Todo lo que pasa en la pantalla del juego: la partida, la racha y si ya avisó la estrella. */
export interface SesionRush {
  juego: EstadoJuego;
  racha: Racha;
  estrellaAvisada: boolean;
  /** Hora del paso anterior, para medir el tiempo jugado. */
  ultimoPaso: number | null;
}

export function sesionInicial(): SesionRush {
  return { juego: estadoInicial(), racha: RACHA_VACIA, estrellaAvisada: false, ultimoPaso: null };
}

export function saltarEnSesion(s: SesionRush): SesionRush {
  return { ...s, juego: saltar(s.juego) };
}

/**
 * Un paso de 30 ms. Devuelve la sesión nueva y si en este paso completó los 10 minutos seguidos.
 * Sin estrella disponible (ya la ganó con este pedido) la racha no cuenta.
 */
export function pasoDeSesion(s: SesionRush, ahora: number, conEstrella: boolean, azar?: () => number): { sesion: SesionRush; ganoEstrella: boolean } {
  const juego = paso(s.juego, azar);
  if (!conEstrella || s.estrellaAvisada) return { sesion: { ...s, juego, ultimoPaso: ahora }, ganoEstrella: false };
  const transcurrido = s.ultimoPaso === null ? MS_POR_PASO : ahora - s.ultimoPaso;
  const racha = transcurrido > MAX_MS_ENTRE_PASOS ? RACHA_VACIA : avanzarRacha(s.racha, transcurrido, juego.modo === 'jugando', ahora);
  const ganoEstrella = racha.ms >= MS_PARA_ESTRELLA;
  return { sesion: { juego, racha, estrellaAvisada: ganoEstrella, ultimoPaso: ahora }, ganoEstrella };
}

/** Salir de la pantalla corta la racha: tiene que ser seguida. */
export function cortarRacha(s: SesionRush): SesionRush {
  return { ...s, racha: RACHA_VACIA };
}
