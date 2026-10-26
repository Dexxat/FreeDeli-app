import { Pedido } from '../models/pedido.js';
import { PeriodoGanancias, ResumenGanancias } from '../models/rider.js';
export declare function resumirGanancias(pedidos: readonly Pedido[], periodo: PeriodoGanancias, ahora: Date, horasOnline: number): ResumenGanancias;
