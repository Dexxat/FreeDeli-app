import { OfertaPedido, Pedido } from '../models/pedido.js';

/** La API manda las fechas como texto: las convierte a Date. */
const fecha = (v: unknown) => (v ? new Date(v as string) : undefined);

export function revivirPedido(p: Pedido): Pedido {
  return {
    ...p,
    creadoEn: new Date(p.creadoEn),
    aceptadoEn: fecha(p.aceptadoEn),
    entregadoEn: fecha(p.entregadoEn),
    retiro: p.retiro ? { kiosco: fecha(p.retiro.kiosco), rider: fecha(p.retiro.rider) } : undefined,
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
