import { fechaRelativa } from './fechas';

describe('fechaRelativa', () => {
  const ahora = new Date(2026, 9, 26, 10, 0);
  it('hoy, ayer y días', () => {
    expect(fechaRelativa(new Date(2026, 9, 26, 1, 0), ahora)).toBe('Hoy');
    expect(fechaRelativa(new Date(2026, 9, 25, 23, 0), ahora)).toBe('Ayer');
    expect(fechaRelativa(new Date(2026, 9, 23), ahora)).toBe('Hace 3 días');
    expect(fechaRelativa(new Date(2026, 8, 30), ahora)).toBe('30/09');
  });
});
