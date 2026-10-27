import { horaArgentina, servicioAbierto, textoHorario } from './horario.rules.js';

// Argentina es UTC−3 todo el año.
const ar = (hora: number, min = 0) => new Date(Date.UTC(2026, 9, 27, hora + 3, min));

describe('horario del servicio', () => {
  it('usa la hora de Argentina', () => {
    expect(horaArgentina(new Date('2026-10-27T03:30:00Z'))).toBe(0);
    expect(horaArgentina(ar(23, 59))).toBe(23);
  });

  it('abre de 00:00 a 07:59', () => {
    expect(servicioAbierto(ar(0))).toBe(true);
    expect(servicioAbierto(ar(3, 15))).toBe(true);
    expect(servicioAbierto(ar(7, 59))).toBe(true);
  });

  it('cierra de 08:00 a 23:59', () => {
    expect(servicioAbierto(ar(8))).toBe(false);
    expect(servicioAbierto(ar(14))).toBe(false);
    expect(servicioAbierto(ar(23, 59))).toBe(false);
  });

  it('acepta horarios que cruzan la medianoche', () => {
    const h = { desde: 22, hasta: 6 };
    expect(servicioAbierto(ar(23), h)).toBe(true);
    expect(servicioAbierto(ar(5), h)).toBe(true);
    expect(servicioAbierto(ar(12), h)).toBe(false);
  });

  it('se lee como texto', () => {
    expect(textoHorario()).toBe('00 a 08 hs');
  });
});
