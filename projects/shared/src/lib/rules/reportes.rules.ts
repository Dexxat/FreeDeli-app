import { gananciaFreeDeli } from './premios.rules.js';
import { EntregaAdmin, FilaMain, GananciasAdmin, GananciasKiosco, PeriodoAdmin } from '../models/admin.js';
import { Pedido } from '../models/pedido.js';
import { ZONAS } from '../models/zona.js';
import { movimientoDePedido } from './admin.rules.js';
import { enRango, inicioDelDia, rangoPeriodo, sumarDias } from './periodos.rules.js';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/** Pedidos entregados cuyo pedido se creó dentro del período. */
export function entregadosEnPeriodo(pedidos: readonly Pedido[], periodo: PeriodoAdmin, ahora: Date): Pedido[] {
  const rango = rangoPeriodo(periodo, ahora);
  return pedidos.filter((p) => p.estado === 'entregado' && enRango(p.creadoEn, rango));
}

/** Barras por hora (jornada, hasta la hora actual) o por día (semana y mes). */
export function barrasPorPeriodo(
  pedidos: readonly Pedido[],
  periodo: PeriodoAdmin,
  ahora: Date,
  monto: (p: Pedido) => number,
): { etiqueta: string; monto: number }[] {
  const barras: { etiqueta: string; monto: number }[] = [];
  if (periodo === 'jornada') {
    for (let h = 0; h <= ahora.getHours(); h++) {
      barras.push({ etiqueta: String(h).padStart(2, '0'), monto: pedidos.filter((p) => p.creadoEn.getHours() === h).reduce((a, p) => a + monto(p), 0) });
    }
    return barras;
  }
  const { desde, hasta } = rangoPeriodo(periodo, ahora);
  for (let d = desde; d < hasta; d = sumarDias(d, 1)) {
    const dia = d.getTime();
    barras.push({
      etiqueta: periodo === 'semana' ? DIAS[d.getDay()] : String(d.getDate()),
      monto: pedidos.filter((p) => inicioDelDia(p.creadoEn).getTime() === dia).reduce((a, p) => a + monto(p), 0),
    });
  }
  return barras;
}

/** Ganancia de FreeDeli (comisiones menos premios) por pedidos entregados. `pedidos` puede traer de más: se filtra acá. */
export function gananciasAdmin(pedidos: readonly Pedido[], periodo: PeriodoAdmin, ahora: Date): GananciasAdmin {
  const lista = entregadosEnPeriodo(pedidos, periodo, ahora);
  const total = lista.reduce((a, p) => a + gananciaFreeDeli(p), 0);
  return {
    periodo,
    total,
    pedidos: lista.length,
    promedioPorPedido: lista.length ? Math.round(total / lista.length) : 0,
    facturado: lista.reduce((a, p) => a + movimientoDePedido(p).totalCliente, 0),
    porZona: ZONAS.map(({ id }) => {
      const deZona = lista.filter((p) => p.zona === id);
      return { zona: id, total: deZona.reduce((a, p) => a + gananciaFreeDeli(p), 0), pedidos: deZona.length };
    }),
    barras: barrasPorPeriodo(lista, periodo, ahora, gananciaFreeDeli),
  };
}

/** Neto del kiosco: cobrado menos envíos y comisiones. `pedidos` son los del kiosco. */
export function gananciasKiosco(pedidos: readonly Pedido[], periodo: PeriodoAdmin, ahora: Date): GananciasKiosco {
  const lista = entregadosEnPeriodo(pedidos, periodo, ahora);
  const movs = lista.map(movimientoDePedido);
  const suma = (f: (m: (typeof movs)[number]) => number) => movs.reduce((a, m) => a + f(m), 0);
  return {
    periodo,
    pedidos: lista.length,
    cobrado: suma((m) => m.totalCliente),
    envios: suma((m) => m.envioRider),
    comisiones: suma((m) => m.comisionFreeDeli),
    premios: suma((m) => m.descuentoPremio),
    neto: suma((m) => m.netoKiosco),
    barras: barrasPorPeriodo(lista, periodo, ahora, (p) => movimientoDePedido(p).netoKiosco),
  };
}

/** Fila de MAIN en FreeDeli Dev. */
export function filaMain(p: Pedido, riderNombre?: string): FilaMain {
  return {
    pedidoId: p.id,
    numero: p.numero,
    zona: p.zona,
    kioscoId: p.kioscoId,
    kioscoNombre: p.kioscoNombre,
    totalKiosco: movimientoDePedido(p).netoKiosco,
    estado: p.estado,
    riderId: p.riderId,
    riderNombre,
    gananciaRider: p.estado === 'cancelado' ? 0 : p.gananciaRider + p.propina,
  };
}

/** Entrega finalizada con todo su detalle. */
export function entregaAdmin(p: Pedido, riderNombre?: string): EntregaAdmin {
  return {
    ...movimientoDePedido(p),
    zona: p.zona,
    kioscoNombre: p.kioscoNombre,
    riderId: p.riderId,
    riderNombre,
    destino: p.destino.direccion,
    items: p.items,
    aceptadoEn: p.aceptadoEn,
    entregadoEn: p.entregadoEn,
    duracionMin: p.aceptadoEn && p.entregadoEn ? Math.round((p.entregadoEn.getTime() - p.aceptadoEn.getTime()) / 60_000) : null,
  };
}
