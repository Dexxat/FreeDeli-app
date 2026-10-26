import { DemandaZona, ZonaId } from '../models/zona.js';
export declare function repartirProbabilidad(zonas: readonly ZonaId[]): Record<ZonaId, number>;
export declare function alternarZona(zonas: readonly ZonaId[], zona: ZonaId): ZonaId[];
export declare function pedidosPorRider(d: DemandaZona): number;
