import { Kiosco } from './kiosco';
import { ZonaId } from './zona';

export interface DireccionEntrega {
  direccion: string;
  notas?: string;
  zona: ZonaId;
}

export interface Usuario {
  id: string;
  /** Nombre para el saludo, por ejemplo "Martina". */
  nombre: string;
  /** Nombre corto que ve el rider, por ejemplo "Martina R.". */
  nombreCorto: string;
  telefono: string;
  email: string;
  direccion: DireccionEntrega;
}

/** Lo que el usuario ve del rider que lleva su pedido. */
export interface RiderPublico {
  nombre: string;
  vehiculo: string;
  patente: string;
}

/** Último pedido en un kiosco, para "Pedí de nuevo". */
export interface KioscoReciente {
  kiosco: Kiosco;
  pedidoId: string;
  fecha: Date;
  cantidadProductos: number;
  total: number;
}

/** Lo que manda la app al crear un pedido. Los precios los pone el servidor. */
export interface NuevoPedido {
  kioscoId: string;
  items: { productoId: string; cantidad: number }[];
}
