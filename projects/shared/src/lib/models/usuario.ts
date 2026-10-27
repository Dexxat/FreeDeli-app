import { Kiosco } from './kiosco.js';
import { Ubicacion, ZonaId } from './zona.js';

export interface DireccionEntrega {
  direccion: string;
  notas?: string;
  zona: ZonaId;
  /** La pone el servidor al geolocalizar la dirección. */
  ubicacion?: Ubicacion;
}

/** Datos personales que el usuario edita en Ajustes. */
export interface DatosPersonales {
  /** Nombre y apellido, por ejemplo "Martina Rodríguez". */
  nombre: string;
  dni: string;
  email: string;
  telefono: string;
}

export interface Usuario extends DatosPersonales {
  id: string;
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
