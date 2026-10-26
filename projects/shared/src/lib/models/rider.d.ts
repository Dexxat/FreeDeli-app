import { ZonaId } from './zona.js';
export interface Rider {
    id: string;
    nombre: string;
    telefono: string;
    email: string;
    dni: string;
    vehiculo: {
        modelo: string;
        patente: string;
    };
    cobro: {
        aliasCbu: string;
    };
    preferencias: {
        notificaciones: boolean;
        sonidos8bit: boolean;
    };
    disponible: boolean;
    zonas: ZonaId[];
    pausado: boolean;
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
    barras: BarraGanancia[];
}
