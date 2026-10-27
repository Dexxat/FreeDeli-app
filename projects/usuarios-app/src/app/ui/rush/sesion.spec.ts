import { MS_POR_PASO } from './motor';
import { MS_RESPIRO_ENTRE_PARTIDAS } from './racha';
import { SesionRush, cortarRacha, pasoDeSesion, saltarEnSesion, sesionInicial } from './sesion';

/** Juega `minutos` reintentando apenas choca, con obstáculos al azar fijo. Cuenta las estrellas avisadas. */
function jugar(s: SesionRush, minutos: number, inicio: number, conEstrella = true) {
  let estrellas = 0;
  let ahora = inicio;
  for (let t = 0; t < (minutos * 60_000) / MS_POR_PASO; t++) {
    if (s.juego.modo !== 'jugando' || t % 20 === 0) s = saltarEnSesion(s);
    ahora += MS_POR_PASO;
    const r = pasoDeSesion(s, ahora, conEstrella, () => 0.5);
    s = r.sesion;
    if (r.ganoEstrella) estrellas++;
  }
  return { s, estrellas, ahora };
}

describe('sesión de FREEDELI RUSH', () => {
  it('avisa la estrella una sola vez, a los 10 minutos de juego seguido (con reintentos)', () => {
    const a = jugar(sesionInicial(), 9.9, 0);
    expect(a.estrellas).toBe(0);
    const b = jugar(a.s, 0.2, a.ahora);
    expect(b.estrellas).toBe(1);
    expect(jugar(b.s, 11, b.ahora).estrellas).toBe(0);
  });

  it('antes de empezar no cuenta', () => {
    let s = sesionInicial();
    for (let i = 0; i < 1000; i++) s = pasoDeSesion(s, i * MS_POR_PASO, true).sesion;
    expect(s.racha.ms).toBe(0);
  });

  it('si deja de jugar más que el respiro, la racha vuelve a empezar', () => {
    const a = jugar(sesionInicial(), 8, 0);
    let s = a.s;
    let ahora = a.ahora;
    // Sin tocar: choca y se queda quieto.
    for (let t = 0; t < (MS_RESPIRO_ENTRE_PARTIDAS + 10_000) / MS_POR_PASO; t++) {
      ahora += MS_POR_PASO;
      s = pasoDeSesion(s, ahora, true, () => 0.1).sesion;
    }
    expect(s.racha.ms).toBe(0);
    expect(jugar(s, 8, ahora).estrellas).toBe(0);
  });

  it('mide tiempo de reloj: con temporizadores lentos igual llega a los 10 minutos', () => {
    let s = sesionInicial();
    let ahora = 0;
    let estrellas = 0;
    // Un paso cada 2 segundos (teléfono frenado), reintentando al chocar.
    for (let t = 0; t < 305; t++) {
      if (s.juego.modo !== 'jugando') s = saltarEnSesion(s);
      ahora += 2000;
      const r = pasoDeSesion(s, ahora, true, () => 0.5);
      s = r.sesion;
      if (r.ganoEstrella) estrellas++;
    }
    expect(estrellas).toBe(1);
  });

  it('un salto largo (pantalla bloqueada) corta la racha', () => {
    const a = jugar(sesionInicial(), 5, 0);
    expect(pasoDeSesion(a.s, a.ahora + 60_000, true).sesion.racha.ms).toBe(0);
  });

  it('salir de la pantalla corta la racha', () => {
    const a = jugar(sesionInicial(), 5, 0);
    expect(cortarRacha(a.s).racha.ms).toBe(0);
  });

  it('sin estrella disponible no cuenta', () => {
    expect(jugar(sesionInicial(), 11, 0, false).estrellas).toBe(0);
  });
});
