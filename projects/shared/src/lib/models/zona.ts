export type ZonaId = 'san-miguel' | 'muniz' | 'bella-vista';

export interface Zona {
  id: ZonaId;
  nombre: string;
}

/** Zonas de operación, en el orden en que se muestran. */
export const ZONAS: readonly Zona[] = [
  { id: 'san-miguel', nombre: 'San Miguel' },
  { id: 'muniz', nombre: 'Muñiz' },
  { id: 'bella-vista', nombre: 'Bella Vista' },
];

export interface Ubicacion {
  lat: number;
  lng: number;
}

/** Centro aproximado de cada zona. */
export const CENTRO_ZONA: Record<ZonaId, Ubicacion> = {
  'san-miguel': { lat: -34.5433, lng: -58.7117 },
  muniz: { lat: -34.5486, lng: -58.6997 },
  'bella-vista': { lat: -34.5626, lng: -58.6895 },
};

export function nombreZona(id: ZonaId): string {
  return ZONAS.find((z) => z.id === id)?.nombre ?? id;
}

/** Demanda de una zona en la jornada, para que el rider decida dónde ponerse en cola. */
export interface DemandaZona {
  zona: ZonaId;
  pedidosJornada: number;
  ridersActivos: number;
}
