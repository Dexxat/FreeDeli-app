import { ZonaId } from './zona.js';
export type EstadoPedido = 'esperando' | 'aceptado' | 'retirado' | 'en-camino' | 'entregado' | 'cancelado';
export type PasoEstado = Extract<EstadoPedido, 'aceptado' | 'retirado' | 'en-camino' | 'entregado'>;
export declare const PASOS_ESTADO: readonly {
    id: PasoEstado;
    etiqueta: string;
}[];
export type FasePedido = 'stock' | 'ajuste' | 'transferencia' | 'rider' | 'aprobacion';
export type EstadoPago = 'pendiente' | 'transferido' | 'liberado';
export interface ItemPedido {
    productoId: string;
    nombre: string;
    cantidad: number;
    precioUnitario: number;
}
export interface Pedido {
    id: string;
    numero: number;
    zona: ZonaId;
    kioscoId: string;
    kioscoNombre: string;
    kioscoDireccion: string;
    usuarioId: string;
    destino: {
        nombre: string;
        direccion: string;
        notas?: string;
    };
    items: ItemPedido[];
    costoEnvio: number;
    distanciaKm: number;
    propina: number;
    gananciaRider: number;
    pago: EstadoPago;
    aliasKiosco: string;
    comisionFreeDeli: number;
    pin: string;
    estado: EstadoPedido;
    fase?: FasePedido;
    itemsQuitados?: ItemPedido[];
    ridersRechazados?: string[];
    retiro?: {
        kiosco?: Date;
        rider?: Date;
    };
    riderId?: string;
    creadoEn: Date;
    aceptadoEn?: Date;
    entregadoEn?: Date;
}
export declare function subtotalProductos(p: Pick<Pedido, 'items'>): number;
export declare function totalPedido(p: Pick<Pedido, 'items' | 'costoEnvio'>): number;
export declare function codigoPedido(p: Pick<Pedido, 'numero'>): string;
export declare function cantidadProductos(p: Pick<Pedido, 'items'>): number;
export interface OfertaPedido {
    pedidoId: string;
    numero: number;
    zona: ZonaId;
    kioscoNombre: string;
    kioscoDireccion: string;
    entregaAproximada: string;
    cantidadProductos: number;
    gananciaRider: number;
    expiraEn: Date;
}
