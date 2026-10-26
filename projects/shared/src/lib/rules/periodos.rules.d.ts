import { PeriodoGanancias, PeriodoHistorial } from '../models/rider.js';
export interface Rango {
    desde: Date;
    hasta: Date;
}
declare function inicioDelDia(d: Date): Date;
declare function sumarDias(d: Date, dias: number): Date;
export declare function rangoPeriodo(periodo: PeriodoHistorial | PeriodoGanancias | 'jornada', ahora: Date): Rango;
export declare function enRango(fecha: Date, r: Rango): boolean;
export { inicioDelDia, sumarDias };
