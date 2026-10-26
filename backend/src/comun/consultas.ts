import { BadRequestException } from '@nestjs/common';
import { ZONAS_API, zonaDb, type ZonaApi } from './zonas.js';

/** Valida un período de la query; si falta, usa el primero. */
export function periodoDe<T extends string>(valor: string | undefined, permitidos: readonly T[]): T {
  if (valor === undefined) return permitidos[0];
  if (!permitidos.includes(valor as T)) throw new BadRequestException(`Período inválido. Usá ${permitidos.join(', ')}.`);
  return valor as T;
}

/** "san-miguel,muniz" → zonas de la base. Vacío: las tres. */
export function zonasDe(valor: string | undefined) {
  const ids = (valor ?? '').split(',').filter((z): z is ZonaApi => ZONAS_API.includes(z as ZonaApi));
  return (ids.length ? ids : [...ZONAS_API]).map(zonaDb);
}

export const PERIODOS_HISTORIAL = ['hoy', 'semana', 'mes'] as const;
export const PERIODOS_ADMIN = ['jornada', 'semana', 'mes'] as const;
export const PERIODOS_RIDER = ['jornada', 'semana', 'mes-pasado'] as const;
