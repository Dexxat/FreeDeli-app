import { Zona } from '../generated/prisma/enums.js';

/** Zonas como las usan las apps ('san-miguel') y como las guarda la base (SAN_MIGUEL). */
export type ZonaApi = 'san-miguel' | 'muniz' | 'bella-vista';
export const ZONAS_API: readonly ZonaApi[] = ['san-miguel', 'muniz', 'bella-vista'];

const A_DB: Record<ZonaApi, Zona> = { 'san-miguel': Zona.SAN_MIGUEL, muniz: Zona.MUNIZ, 'bella-vista': Zona.BELLA_VISTA };

export function zonaDb(z: ZonaApi): Zona {
  return A_DB[z];
}

export function zonaApi(z: Zona): ZonaApi {
  return (Object.keys(A_DB) as ZonaApi[]).find((k) => A_DB[k] === z)!;
}

/** Centro aproximado de cada zona. */
const CENTRO: Record<ZonaApi, { lat: number; lng: number }> = {
  'san-miguel': { lat: -34.5433, lng: -58.7117 },
  muniz: { lat: -34.5486, lng: -58.6997 },
  'bella-vista': { lat: -34.5626, lng: -58.6895 },
};

/**
 * Geolocalización provisoria: el centro de la zona más un corrimiento fijo según el texto.
 * Se reemplaza por un servicio de mapas.
 */
export function geolocalizar(direccion: string, zona: ZonaApi): { lat: number; lng: number } {
  let h = 0;
  for (const c of direccion) h = (h * 31 + c.charCodeAt(0)) | 0;
  const desvio = (n: number) => (((n % 1000) + 1000) % 1000) / 1000 - 0.5;
  return { lat: CENTRO[zona].lat + desvio(h) * 0.02, lng: CENTRO[zona].lng + desvio(h >> 10) * 0.02 };
}
