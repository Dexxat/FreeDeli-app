import { EstadoJuego, estadoInicial, paso, saltar } from './motor';
import { MS_RESPIRO_ENTRE_PARTIDAS, RACHA_VACIA, avanzarRacha, formatoRacha } from './racha';

const correr = (e: EstadoJuego, n: number, azar = () => 0.5) => {
  for (let i = 0; i < n; i++) e = paso(e, azar);
  return e;
};

describe('motor de FREEDELI RUSH', () => {
  it('arranca con SALTAR y la moto sube y vuelve al piso', () => {
    let e = saltar(estadoInicial());
    expect(e.modo).toBe('jugando');
    e = paso(e);
    expect(e.altura).toBeGreaterThan(0);
    e = correr(e, 30);
    expect(e.altura).toBe(0);
    expect(e.saltos).toBe(0);
  });

  it('permite doble salto, no triple', () => {
    let e = saltar(estadoInicial());
    e = paso(e);
    e = saltar(e);
    expect(e.saltos).toBe(2);
    expect(saltar(e)).toBe(e);
  });

  it('aparecen obstáculos y chocar termina la partida', () => {
    // Siempre tachos (azar 0.1); sin saltar, la moto choca.
    let e = saltar(estadoInicial());
    e = correr(e, 400, () => 0.1);
    expect(e.modo).toBe('choque');
    expect(e.puntos).toBeGreaterThan(0);
    // Tras chocar, SALTAR empieza de nuevo.
    expect(saltar(e)).toMatchObject({ modo: 'jugando', puntos: 0, obstaculos: [] });
  });

  it('la velocidad sube con el tiempo hasta un máximo', () => {
    const e = { ...saltar(estadoInicial()), pasos: 1_000_000 };
    expect(paso(e).velocidad).toBe(11);
  });
});

describe('racha de juego', () => {
  it('suma el tiempo seguido, con reintentos dentro del respiro', () => {
    let r = avanzarRacha(RACHA_VACIA, 30, true, 0);
    r = avanzarRacha(r, 30, false, 1_000);
    r = avanzarRacha(r, 30, false, 1_000 + MS_RESPIRO_ENTRE_PARTIDAS);
    expect(r.ms).toBe(90);
    r = avanzarRacha(r, 30, true, 30_000);
    expect(r).toEqual({ ms: 120, quietoDesde: null });
  });

  it('vuelve a 0 si deja de jugar más que el respiro', () => {
    let r = avanzarRacha({ ms: 500_000, quietoDesde: null }, 30, false, 0);
    r = avanzarRacha(r, 30, false, MS_RESPIRO_ENTRE_PARTIDAS + 1);
    expect(r).toEqual(RACHA_VACIA);
  });

  it('no arranca a contar sin jugar', () => {
    expect(avanzarRacha(RACHA_VACIA, 30, false, 0)).toEqual(RACHA_VACIA);
  });

  it('se muestra en minutos y segundos', () => {
    expect(formatoRacha(192_000)).toBe('3:12');
    expect(formatoRacha(600_000)).toBe('10:00');
  });
});
