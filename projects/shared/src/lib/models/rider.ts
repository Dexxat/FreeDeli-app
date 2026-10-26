import { ZonaId } from './zona.js';

export interface Rider {
  id: string;
  nombre: string;
  telefono: string;
  email: string;
  dni: string;
  vehiculo: { modelo: string; patente: string };
  cobro: { aliasCbu: string };
  preferencias: { notificaciones: boolean; sonidos8bit: boolean };
  /** Interruptor ON / OFF. */
  disponible: boolean;
  /** Siempre al menos una. */
  zonas: ZonaId[];
  /** Pausado desde FreeDeli Dev. */
  pausado: boolean;
  /** Fecha de alta en FreeDeli. */
  riderDesde: Date;
}

export type PeriodoHistorial = 'hoy' | 'semana' | 'mes';
export type PeriodoGanancias = 'jornada' | 'semana' | 'mes-pasado';

export interface BarraGanancia {
  etiqueta: string;
  monto: number;
}

export interface ResumenGanancias {
  periodo: PeriodoGanancias;
  envios: number;
  propinas: number;
  total: number;
  cantidadPedidos: number;
  promedioPorPedido: number;
  horasOnline: number;
  /** Por hora (jornada), por día (semana) o por semana (mes pasado). */
  barras: BarraGanancia[];
}

/** Código corto y legible del rider: "R-31B3F5" para un id largo, o el id en mayúsculas si ya es corto. */
export function codigoRider(id: string): string {
  return id.length > 8 ? `R-${id.replace(/-/g, '').slice(0, 6).toUpperCase()}` : id.toUpperCase();
}
