import { ZonaId } from './zona';

export interface Kiosco {
  id: string;
  nombre: string;
  zona: ZonaId;
  direccion: string;
  abierto: boolean;
  /** Pausado desde FreeDeli Dev. */
  pausado: boolean;
  /** Saldo en pesos que le queda para seguir operando. */
  saldo: number;
  /** Tiempo estimado de entrega, en minutos. */
  tiempoEstimadoMin: number;
  /** Costo de envío en pesos. Lo paga el cliente y es la ganancia del rider. */
  costoEnvio: number;
  /** Alias al que el cliente transfiere el pedido. */
  aliasCobro: string;
}

export interface Producto {
  id: string;
  kioscoId: string;
  nombre: string;
  precio: number;
}
