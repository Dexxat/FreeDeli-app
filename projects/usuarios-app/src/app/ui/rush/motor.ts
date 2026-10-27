/**
 * Motor de FREEDELI RUSH: la moto avanza sola y salta (doble salto) obstáculos que vienen
 * cada vez más rápido. Lógica pura, sin Angular: un `paso()` cada 30 ms.
 * Es el juego del diseño de referencia (pantalla Seguimiento), con sus mismas medidas.
 */
export type TipoObstaculo = 'tacho' | 'arbusto' | 'bolsa' | 'pozo';

export interface Obstaculo {
  id: number;
  tipo: TipoObstaculo;
  x: number;
  ancho: number;
  /** Altura que hay que superar. Los pozos no tienen: hay que saltarlos. */
  alto: number;
}

export type ModoJuego = 'esperando' | 'jugando' | 'choque';

export interface EstadoJuego {
  modo: ModoJuego;
  /** Altura de la moto sobre el piso, en px. Negativa al caer en un pozo. */
  altura: number;
  velocidadVertical: number;
  saltos: 0 | 1 | 2;
  velocidad: number;
  pasos: number;
  puntos: number;
  obstaculos: Obstaculo[];
  proximoEn: number;
  secuencia: number;
}

export const MS_POR_PASO = 30;
export const ANCHO_ESCENA = 326;
const X_MOTO = 22;
const ANCHO_MOTO = 46;
const TECHO = 104;
const FONDO_POZO = -26;
const GRAVEDAD = 1.2;

export function estadoInicial(): EstadoJuego {
  return { modo: 'esperando', altura: 0, velocidadVertical: 0, saltos: 0, velocidad: 4, pasos: 0, puntos: 0, obstaculos: [], proximoEn: 60, secuencia: 0 };
}

/** Toca SALTAR: arranca, reintenta tras chocar, salta o hace el doble salto. */
export function saltar(e: EstadoJuego): EstadoJuego {
  if (e.modo !== 'jugando') return { ...estadoInicial(), modo: 'jugando', velocidadVertical: 12, saltos: 1, proximoEn: 50, secuencia: e.secuencia };
  if (e.saltos === 0 && e.altura <= 0.01) return { ...e, velocidadVertical: 12, saltos: 1 };
  if (e.saltos === 1) return { ...e, velocidadVertical: 10, saltos: 2 };
  return e;
}

function nuevoObstaculo(velocidad: number, azar: number): Omit<Obstaculo, 'id' | 'x'> {
  if (azar < 0.28) return { tipo: 'tacho', ancho: 18, alto: 24 };
  if (azar < 0.52) return { tipo: 'arbusto', ancho: 26, alto: 18 };
  if (azar < 0.76) return { tipo: 'bolsa', ancho: 20, alto: 16 };
  return { tipo: 'pozo', ancho: Math.round(26 * velocidad + 12), alto: 0 };
}

/** Avanza el juego un paso. `azar` devuelve números en [0, 1): se inyecta para poder probarlo. */
export function paso(e: EstadoJuego, azar: () => number = Math.random): EstadoJuego {
  if (e.modo !== 'jugando') return e;
  const velocidad = Math.min(11, 4 + e.pasos * 0.0025);
  const obstaculos = e.obstaculos.map((o) => ({ ...o, x: o.x - velocidad })).filter((o) => o.x + o.ancho > -10);
  let proximoEn = e.proximoEn - 1;
  let secuencia = e.secuencia;
  if (proximoEn <= 0) {
    const o = nuevoObstaculo(velocidad, azar());
    secuencia += 1;
    obstaculos.push({ ...o, id: secuencia, x: ANCHO_ESCENA + 10 });
    proximoEn = Math.round((o.ancho + 170 + azar() * 160) / velocidad);
  }

  let velocidadVertical = e.velocidadVertical - GRAVEDAD;
  let altura = e.altura + velocidadVertical;
  let saltos = e.saltos;
  const centro = X_MOTO + ANCHO_MOTO / 2;
  const sobrePozo = obstaculos.some((o) => o.tipo === 'pozo' && centro > o.x + 4 && centro < o.x + o.ancho - 4);
  if (altura > TECHO) {
    altura = TECHO;
    velocidadVertical = 0;
  }
  if (altura <= 0 && !sobrePozo && e.altura >= 0) {
    altura = 0;
    velocidadVertical = 0;
    saltos = 0;
  }

  const choco =
    altura < FONDO_POZO ||
    obstaculos.some((o) => o.tipo !== 'pozo' && X_MOTO + 38 > o.x + 2 && X_MOTO + 8 < o.x + o.ancho - 2 && altura < o.alto - 2);
  const pasos = e.pasos + 1;
  const puntos = Math.floor(pasos / 3);
  if (choco) return { ...e, modo: 'choque', obstaculos, altura: Math.max(altura, FONDO_POZO), puntos };
  return { ...e, obstaculos, altura, velocidadVertical, saltos, velocidad, pasos, puntos, proximoEn, secuencia };
}
