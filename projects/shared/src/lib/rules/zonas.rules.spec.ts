import { alternarZona, pedidosPorRider, repartirProbabilidad } from './zonas.rules.js';

describe('repartirProbabilidad', () => {
  it('1 zona: 100 %', () => {
    expect(repartirProbabilidad(['muniz'])).toEqual({ 'san-miguel': 0, muniz: 100, 'bella-vista': 0 });
  });
  it('2 zonas: 50 / 50', () => {
    expect(repartirProbabilidad(['bella-vista', 'san-miguel'])).toEqual({ 'san-miguel': 50, muniz: 0, 'bella-vista': 50 });
  });
  it('3 zonas: 34 / 33 / 33', () => {
    expect(repartirProbabilidad(['muniz', 'bella-vista', 'san-miguel'])).toEqual({ 'san-miguel': 34, muniz: 33, 'bella-vista': 33 });
  });
  it('siempre suma 100 con al menos una zona', () => {
    const r = repartirProbabilidad(['san-miguel', 'muniz', 'bella-vista']);
    expect(Object.values(r).reduce((a, b) => a + b, 0)).toBe(100);
  });
});

describe('alternarZona', () => {
  it('agrega una zona respetando el orden de ZONAS', () => {
    expect(alternarZona(['bella-vista'], 'san-miguel')).toEqual(['san-miguel', 'bella-vista']);
  });
  it('quita una zona si quedan otras', () => {
    expect(alternarZona(['san-miguel', 'muniz'], 'muniz')).toEqual(['san-miguel']);
  });
  it('no deja la selección vacía', () => {
    expect(alternarZona(['muniz'], 'muniz')).toEqual(['muniz']);
  });
});

describe('pedidosPorRider', () => {
  it('divide y redondea a un decimal', () => {
    expect(pedidosPorRider({ zona: 'muniz', pedidosJornada: 10, ridersActivos: 3 })).toBe(3.3);
  });
  it('sin riders activos devuelve los pedidos', () => {
    expect(pedidosPorRider({ zona: 'muniz', pedidosJornada: 4, ridersActivos: 0 })).toBe(4);
  });
});
