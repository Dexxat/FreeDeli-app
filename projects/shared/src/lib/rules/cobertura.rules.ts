import { CENTRO_ZONA, Ubicacion, ZonaId } from '../models/zona.js';

/**
 * Área donde FreeDeli entrega: el rombo entre San Miguel, Muñiz y Bella Vista.
 * _Coordenadas aproximadas_, estimadas a partir del mapa de cobertura. Ajustarlas con las esquinas reales.
 */
export const AREA_COBERTURA: readonly Ubicacion[] = [
  { lat: -34.5426, lng: -58.7121 }, // norte: estación San Miguel
  { lat: -34.559, lng: -58.6881 }, // este: hacia la estación Bella Vista, junto a las vías
  { lat: -34.5747, lng: -58.7051 }, // sur: hacia Av. Gaspar Campos
  { lat: -34.5577, lng: -58.7287 }, // oeste: hacia Gral. Las Heras
];

/** true si el punto está dentro del polígono (algoritmo de cruce de rayos). */
export function dentroDelArea(p: Ubicacion, area: readonly Ubicacion[] = AREA_COBERTURA): boolean {
  let dentro = false;
  for (let i = 0, j = area.length - 1; i < area.length; j = i++) {
    const a = area[i];
    const b = area[j];
    if (a.lat > p.lat !== b.lat > p.lat && p.lng < ((b.lng - a.lng) * (p.lat - a.lat)) / (b.lat - a.lat) + a.lng) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/**
 * Geolocalización provisoria hasta tener un servicio de mapas: el centro de la zona
 * más un corrimiento fijo según el texto de la dirección, siempre dentro del área.
 */
export function geolocalizarProvisorio(direccion: string, zona: ZonaId): Ubicacion {
  let h = 0;
  for (const c of direccion) h = (h * 31 + c.charCodeAt(0)) | 0;
  const desvio = (n: number) => (((n % 1000) + 1000) % 1000) / 1000 - 0.5;
  const centro = CENTRO_ZONA[zona];
  for (let radio = 0.01; radio > 0.0005; radio /= 2) {
    const p = { lat: centro.lat + desvio(h) * radio, lng: centro.lng + desvio(h >> 10) * radio };
    if (dentroDelArea(p)) return p;
  }
  return centro;
}
