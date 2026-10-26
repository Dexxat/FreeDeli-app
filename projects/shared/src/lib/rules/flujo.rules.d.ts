import { Pedido } from '../models/pedido.js';
export type Resultado = {
    ok: true;
    pedido: Pedido;
} | {
    ok: false;
    error: string;
};
export declare function confirmarStock(p: Pedido, faltantes: readonly string[], comisionPorcentaje: number): Resultado;
export declare function aceptarAjuste(p: Pedido): Resultado;
export declare function cancelarPorCliente(p: Pedido): Resultado;
export declare function confirmarTransferencia(p: Pedido): Resultado;
export declare function asignarRider(p: Pedido, riderId: string): Resultado;
export declare function aprobarRider(p: Pedido, aprobado: boolean, ahora: Date): Resultado;
export declare function confirmarRetiro(p: Pedido, quien: 'kiosco' | 'rider', ahora: Date): Resultado;
export declare function salirEnCamino(p: Pedido): Resultado;
export declare function entregarConPin(p: Pedido, pin: string, ahora: Date): Resultado;
export declare function quienDebeActuar(p: Pedido): 'kiosco' | 'cliente' | 'rider' | 'kiosco-y-rider' | null;
