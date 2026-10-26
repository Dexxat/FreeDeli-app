import { Pedido } from '../models/pedido.js';
import { BarraGanancia, PeriodoGanancias, ResumenGanancias } from '../models/rider.js';
import { enRango, inicioDelDia, rangoPeriodo, sumarDias } from './periodos.rules.js';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

/**
 * Solo cuentan los pedidos entregados. Se ubican por la hora en que se creó el pedido,
 * igual que el historial: un pedido de las 23:50 entregado a las 00:10 es de ese día.
 */
export function resumirGanancias(
  pedidos: readonly Pedido[],
  periodo: PeriodoGanancias,
  ahora: Date,
  horasOnline: number,
): ResumenGanancias {
  const rango = rangoPeriodo(periodo, ahora);
  const entregados = pedidos.filter(
    (p) => p.estado === 'entregado' && enRango(p.creadoEn, rango),
  );
  const envios = entregados.reduce((a, p) => a + p.gananciaRider, 0);
  const propinas = entregados.reduce((a, p) => a + p.propina, 0);
  const total = envios + propinas;
  const cantidadPedidos = entregados.length;
  return {
    periodo,
    envios,
    propinas,
    total,
    cantidadPedidos,
    promedioPorPedido: cantidadPedidos ? Math.round(total / cantidadPedidos) : 0,
    horasOnline,
    barras: armarBarras(entregados, periodo, rango.desde, rango.hasta),
  };
}

function ganancia(p: Pedido): number {
  return p.gananciaRider + p.propina;
}

function armarBarras(entregados: Pedido[], periodo: PeriodoGanancias, desde: Date, hasta: Date): BarraGanancia[] {
  if (periodo === 'jornada') {
    const barras = Array.from({ length: 24 }, (_, h) => ({ etiqueta: h.toString().padStart(2, '0'), monto: 0 }));
    for (const p of entregados) barras[p.creadoEn.getHours()].monto += ganancia(p);
    return barras;
  }
  if (periodo === 'semana') {
    const barras: BarraGanancia[] = [];
    for (let d = desde; d < hasta; d = sumarDias(d, 1)) {
      const dia = d;
      const monto = entregados
        .filter((p) => inicioDelDia(p.creadoEn).getTime() === dia.getTime())
        .reduce((a, p) => a + ganancia(p), 0);
      barras.push({ etiqueta: DIAS[dia.getDay()], monto });
    }
    return barras;
  }
  // mes-pasado: semanas de 7 días desde el día 1 (la última puede ser más corta).
  const barras: BarraGanancia[] = [];
  for (let d = desde, n = 1; d < hasta; d = sumarDias(d, 7), n++) {
    const fin = sumarDias(d, 7) < hasta ? sumarDias(d, 7) : hasta;
    const inicio = d;
    const monto = entregados
      .filter((p) => p.creadoEn >= inicio && p.creadoEn < fin)
      .reduce((a, p) => a + ganancia(p), 0);
    barras.push({ etiqueta: `S${n}`, monto });
  }
  return barras;
}
