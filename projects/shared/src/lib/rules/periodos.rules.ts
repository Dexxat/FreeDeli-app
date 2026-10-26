import { PeriodoGanancias, PeriodoHistorial } from '../models/rider';

export interface Rango {
  desde: Date;
  /** Exclusivo. */
  hasta: Date;
}

function inicioDelDia(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function sumarDias(d: Date, dias: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + dias);
}

/**
 * - hoy / jornada: desde las 00:00 de hoy.
 * - semana: los últimos 7 días, hoy incluido.
 * - mes: desde el día 1 del mes actual.
 * - mes-pasado: el mes calendario anterior completo.
 */
export function rangoPeriodo(periodo: PeriodoHistorial | PeriodoGanancias | 'jornada', ahora: Date): Rango {
  const hoy = inicioDelDia(ahora);
  const manana = sumarDias(hoy, 1);
  switch (periodo) {
    case 'hoy':
    case 'jornada':
      return { desde: hoy, hasta: manana };
    case 'semana':
      return { desde: sumarDias(hoy, -6), hasta: manana };
    case 'mes':
      return { desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1), hasta: manana };
    case 'mes-pasado':
      return {
        desde: new Date(hoy.getFullYear(), hoy.getMonth() - 1, 1),
        hasta: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
      };
  }
}

export function enRango(fecha: Date, r: Rango): boolean {
  return fecha >= r.desde && fecha < r.hasta;
}

export { inicioDelDia, sumarDias };
