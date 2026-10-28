import { MovimientoSaldo } from '../models/admin.js';
import { OfertaPedido, Pedido } from '../models/pedido.js';

/** La API manda las fechas como texto: las convierte a Date. */
const fecha = (v: unknown) => (v ? new Date(v as string) : undefined);

export function revivirPedido(p: Pedido): Pedido {
  return {
    ...p,
    creadoEn: new Date(p.creadoEn),
    aceptadoEn: fecha(p.aceptadoEn),
    enCaminoEn: fecha(p.enCaminoEn),
    entregadoEn: fecha(p.entregadoEn),
    buscandoRiderDesde: fecha(p.buscandoRiderDesde),
    retiro: p.retiro ? { kiosco: fecha(p.retiro.kiosco), rider: fecha(p.retiro.rider) } : undefined,
    cancelacion: p.cancelacion ? { ...p.cancelacion, reintegradoEn: fecha(p.cancelacion.reintegradoEn) } : undefined,
    posicionRider: p.posicionRider ? { ...p.posicionRider, en: new Date(p.posicionRider.en) } : undefined,
  };
}

export function revivirOferta(o: OfertaPedido): OfertaPedido {
  return { ...o, expiraEn: new Date(o.expiraEn) };
}

/** Convierte a Date los campos indicados de cada objeto. */
export function revivirFechas<T>(obj: T, campos: (keyof T)[]): T {
  const copia = { ...obj };
  for (const c of campos) if (copia[c]) (copia as Record<keyof T, unknown>)[c] = new Date(copia[c] as string);
  return copia;
}

/** Movimiento de saldo como lo manda la API: tipo en mayúsculas y fecha en texto. */
export type MovimientoSaldoJson = Omit<MovimientoSaldo, 'tipo' | 'fecha'> & { tipo: 'CARGA' | 'COMISION' | 'PREMIO'; fecha: string };

export function revivirMovimiento(m: MovimientoSaldoJson): MovimientoSaldo {
  return { ...m, fecha: new Date(m.fecha), tipo: m.tipo.toLowerCase() as MovimientoSaldo['tipo'] };
}
