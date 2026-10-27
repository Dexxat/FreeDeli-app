import { montoDeCarga } from './kiosco';

describe('montoDeCarga', () => {
  it('acepta montos en pesos con o sin puntos de miles', () => {
    expect(montoDeCarga('20000')).toBe(20000);
    expect(montoDeCarga('20.000')).toBe(20000);
    expect(montoDeCarga('$ 1.250.000')).toBe(1250000);
    expect(montoDeCarga(' 500 ')).toBe(500);
  });

  it('rechaza negativos, cero, letras y decimales', () => {
    for (const malo of ['-500', '0', '', 'abc', '20,50', '2.0000', '1e5', '500-']) expect(montoDeCarga(malo)).toBeNull();
  });
});
