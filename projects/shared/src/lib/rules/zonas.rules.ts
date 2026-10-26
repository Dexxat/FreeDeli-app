import { DemandaZona, ZONAS, ZonaId } from '../models/zona';

/**
 * Reparte el 100 % de las chances en partes iguales entre las zonas elegidas.
 * El resto se asigna a las primeras zonas (en el orden de ZONAS): 3 zonas → 34 / 33 / 33.
 */
export function repartirProbabilidad(zonas: readonly ZonaId[]): Record<ZonaId, number> {
  const elegidas = ZONAS.map((z) => z.id).filter((id) => zonas.includes(id));
  const resultado: Record<ZonaId, number> = { 'san-miguel': 0, muniz: 0, 'bella-vista': 0 };
  if (elegidas.length === 0) return resultado;
  const base = Math.floor(100 / elegidas.length);
  let resto = 100 - base * elegidas.length;
  for (const id of elegidas) {
    resultado[id] = base + (resto > 0 ? 1 : 0);
    resto--;
  }
  return resultado;
}

/**
 * Agrega o quita una zona. Nunca deja la selección vacía:
 * si se intenta quitar la única zona elegida, devuelve la selección sin cambios.
 */
export function alternarZona(zonas: readonly ZonaId[], zona: ZonaId): ZonaId[] {
  if (zonas.includes(zona)) {
    return zonas.length > 1 ? zonas.filter((z) => z !== zona) : [...zonas];
  }
  return ZONAS.map((z) => z.id).filter((id) => id === zona || zonas.includes(id));
}

/** Pedidos por rider activo. Sin riders activos, devuelve la cantidad de pedidos. */
export function pedidosPorRider(d: DemandaZona): number {
  if (d.ridersActivos === 0) return d.pedidosJornada;
  return Math.round((d.pedidosJornada / d.ridersActivos) * 10) / 10;
}
