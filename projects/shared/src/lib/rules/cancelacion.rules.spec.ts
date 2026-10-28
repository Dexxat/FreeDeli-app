import { inicioConteoCancelaciones, reintegroPendiente } from './cancelacion.rules.js';

describe('cancelaciones', () => {
  const ahora = new Date(2026, 9, 28, 3, 0);
  const dias = (d: number) => new Date(ahora.getTime() - d * 24 * 60 * 60_000);

  it('cuentan la última semana, o desde que Dev reactivó la cuenta', () => {
    expect(inicioConteoCancelaciones(ahora, dias(30))).toEqual(dias(7));
    expect(inicioConteoCancelaciones(ahora, dias(2))).toEqual(dias(2));
  });

  it('el reintegro queda pendiente hasta que el kiosco lo marca', () => {
    const cancelacion = { motivo: 'cliente' as const, reintegro: 1000, riderCobra: false };
    expect(reintegroPendiente({ estado: 'cancelado', cancelacion })).toBe(true);
    expect(reintegroPendiente({ estado: 'cancelado', cancelacion: { ...cancelacion, reintegradoEn: ahora } })).toBe(false);
    expect(reintegroPendiente({ estado: 'cancelado', cancelacion: { ...cancelacion, reintegro: 0 } })).toBe(false);
  });
});
