export type ZonaId = 'san-miguel' | 'muniz' | 'bella-vista';
export interface Zona {
    id: ZonaId;
    nombre: string;
}
export declare const ZONAS: readonly Zona[];
export interface Ubicacion {
    lat: number;
    lng: number;
}
export declare const CENTRO_ZONA: Record<ZonaId, Ubicacion>;
export declare function nombreZona(id: ZonaId): string;
export interface DemandaZona {
    zona: ZonaId;
    pedidosJornada: number;
    ridersActivos: number;
}
