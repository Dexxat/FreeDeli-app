import { Kiosco } from './kiosco.js';
import { Ubicacion, ZonaId } from './zona.js';

/** Referencia escrita para el rider. El pedido se entrega donde está el celular (ver NuevoPedido). */
export interface DireccionEntrega {
  direccion: string;
  notas?: string;
  zona: ZonaId;
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
  /** Estrellas de FREEDELI RUSH hacia el próximo premio (0 a 4). */
  estrellas: number;
  /** Saldo a favor en pesos: se descuenta solo del próximo pedido. */
  saldoFavor: number;
  /** Pausado por cancelaciones: no puede pedir hasta que Dev lo reactive. */
  pausado: boolean;
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
  /** GPS del celular del cliente: ahí se entrega. Sin ubicación no se puede pedir. */
  ubicacion: Ubicacion;
}
