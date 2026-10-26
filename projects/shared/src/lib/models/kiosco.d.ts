import { Ubicacion, ZonaId } from './zona.js';
export interface Kiosco {
    id: string;
    nombre: string;
    zona: ZonaId;
    direccion: string;
    ubicacion: Ubicacion;
    abierto: boolean;
    pausado: boolean;
    saldo: number;
    tiempoEstimadoMin: number;
    costoEnvio: number;
    distanciaKm?: number;
    aliasCobro: string;
}
export interface Producto {
    id: string;
    kioscoId: string;
    nombre: string;
    precio: number;
    disponible: boolean;
}
