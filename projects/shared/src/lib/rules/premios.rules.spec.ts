import { descuentoAplicable, gananciaFreeDeli, puedeGanarEstrella, sumarEstrella } from './premios.rules.js';

const min = (n: number) => n * 60_000;
const ahora = new Date('2026-10-28T04:00:00Z');
const hace = (ms: number) => new Date(ahora.getTime() - ms);

describe('FREEDELI RUSH', () => {
  it('la estrella se gana con 10 minutos en camino, una por pedido', () => {
    expect(puedeGanarEstrella({ estado: 'en-camino', enCaminoEn: hace(min(10)) }, ahora)).toEqual({ ok: true });
    expect(puedeGanarEstrella({ estado: 'en-camino', enCaminoEn: hace(min(9)) }, ahora)).toMatchObject({ ok: false });
    expect(puedeGanarEstrella({ estado: 'en-camino', enCaminoEn: hace(min(12)), estrellaGanada: true }, ahora)).toMatchObject({ ok: false, error: 'Ya sumaste la estrella de este pedido.' });
  });

  it('antes de salir en camino no hay juego', () => {
    expect(puedeGanarEstrella({ estado: 'retirado' }, ahora)).toMatchObject({ ok: false });
  });

  it('se puede reclamar hasta 2 minutos después de la entrega', () => {
    expect(puedeGanarEstrella({ estado: 'entregado', enCaminoEn: hace(min(11)), entregadoEn: hace(min(1)) }, ahora)).toEqual({ ok: true });
    expect(puedeGanarEstrella({ estado: 'entregado', enCaminoEn: hace(min(15)), entregadoEn: hace(min(3)) }, ahora)).toMatchObject({ ok: false });
    expect(puedeGanarEstrella({ estado: 'cancelado', enCaminoEn: hace(min(15)) }, ahora)).toMatchObject({ ok: false });
  });

  it('con 5 estrellas se gana $2.500 y vuelven a 0', () => {
    expect(sumarEstrella({ estrellas: 0, saldoFavor: 0 })).toEqual({ estrellas: 1, saldoFavor: 0, premio: false });
    expect(sumarEstrella({ estrellas: 4, saldoFavor: 0 })).toEqual({ estrellas: 0, saldoFavor: 2500, premio: true });
    expect(sumarEstrella({ estrellas: 4, saldoFavor: 2500 })).toEqual({ estrellas: 0, saldoFavor: 5000, premio: true });
  });

  it('el saldo a favor se usa sin pasarse del total', () => {
    expect(descuentoAplicable(2500, 19_300)).toBe(2500);
    expect(descuentoAplicable(0, 19_300)).toBe(0);
    expect(descuentoAplicable(5000, 3000)).toBe(3000);
  });

  it('el premio sale de la ganancia de FreeDeli', () => {
    expect(gananciaFreeDeli({ comisionFreeDeli: 1680, descuentoPremio: 2500 })).toBe(-820);
    expect(gananciaFreeDeli({ comisionFreeDeli: 1680 })).toBe(1680);
  });
});
