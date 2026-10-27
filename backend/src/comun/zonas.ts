import { Zona } from '../generated/prisma/enums.js';
import { geolocalizarProvisorio } from '../dominio.js';

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

/** Geolocalización provisoria (centro de la zona más un corrimiento, siempre dentro del área). Se reemplaza por un servicio de mapas. */
export function geolocalizar(direccion: string, zona: ZonaApi): { lat: number; lng: number } {
  return geolocalizarProvisorio(direccion, zona);
}
