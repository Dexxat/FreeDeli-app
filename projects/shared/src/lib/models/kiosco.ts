import { Ubicacion, ZonaId } from './zona.js';

export interface Kiosco {
  id: string;
  nombre: string;
  zona: ZonaId;
  direccion: string;
  ubicacion: Ubicacion;
  /**
   * Si recibe pedidos ahora (no está pausado y tiene saldo). Lo calcula el servidor
   * solo para la app de usuarios. Todos los kioscos operan en el horario de FreeDeli.
   */
  recibePedidos?: boolean;
  /** Pausado desde FreeDeli Dev. */
  pausado: boolean;
  /** Saldo en pesos que le queda para seguir operando. */
  saldo: number;
  /** Tiempo estimado de entrega, en minutos. */
  tiempoEstimadoMin: number;
  /**
   * Costo de envío hasta la dirección del usuario actual, según la distancia.
   * Lo calcula el servidor; lo paga el cliente y es la ganancia del rider.
   */
  costoEnvio: number;
  /** Distancia hasta la dirección del usuario actual, en km. */
  distanciaKm?: number;
  /** Alias al que el cliente transfiere el pedido. */
  aliasCobro: string;
}

export interface Producto {
  id: string;
  kioscoId: string;
  nombre: string;
  precio: number;
  /** El kiosco lo marca sin stock: no aparece en la app de usuarios. */
  disponible: boolean;
}
