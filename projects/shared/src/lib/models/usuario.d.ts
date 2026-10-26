import { Kiosco } from './kiosco.js';
import { Ubicacion, ZonaId } from './zona.js';
export interface DireccionEntrega {
    direccion: string;
    notas?: string;
    zona: ZonaId;
    ubicacion?: Ubicacion;
}
export interface Usuario {
    id: string;
    nombre: string;
    nombreCorto: string;
    telefono: string;
    email: string;
    direccion: DireccionEntrega;
}
export interface RiderPublico {
    nombre: string;
    vehiculo: string;
    patente: string;
}
export interface KioscoReciente {
    kiosco: Kiosco;
    pedidoId: string;
    fecha: Date;
    cantidadProductos: number;
    total: number;
}
export interface NuevoPedido {
    kioscoId: string;
    items: {
        productoId: string;
        cantidad: number;
    }[];
}
