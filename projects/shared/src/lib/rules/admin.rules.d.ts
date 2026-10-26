import { MovimientoKiosco } from '../models/admin.js';
import { Pedido } from '../models/pedido.js';
export declare const SALDO_BAJO = 10000;
export declare const MINUTOS_DEMORA = 10;
export declare function movimientoDePedido(p: Pedido): MovimientoKiosco;
