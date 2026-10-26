import { ZonaId } from './zona';

/**
 * Estados de un pedido.
 * - `esperando`: creado por el usuario, todavía sin rider.
 * - `aceptado` → `retirado` → `en-camino` → `entregado`: los pasos de la barra de estado.
 * - `cancelado`: terminal, fuera de la barra.
 */
export type EstadoPedido = 'esperando' | 'aceptado' | 'retirado' | 'en-camino' | 'entregado' | 'cancelado';

/** Los cuatro pasos de la barra de estado compartida entre Usuarios y Riders. */
export type PasoEstado = Extract<EstadoPedido, 'aceptado' | 'retirado' | 'en-camino' | 'entregado'>;

export const PASOS_ESTADO: readonly { id: PasoEstado; etiqueta: string }[] = [
  { id: 'aceptado', etiqueta: 'Aceptado' },
  { id: 'retirado', etiqueta: 'Retirado' },
  { id: 'en-camino', etiqueta: 'En camino' },
  { id: 'entregado', etiqueta: 'Entregado' },
];

export type EstadoCobro = 'pagado' | 'cobrar-en-destino';

export interface ItemPedido {
  productoId: string;
  nombre: string;
  cantidad: number;
  precioUnitario: number;
}

export interface Pedido {
  id: string;
  /** Número visible, por ejemplo 1042. */
  numero: number;
  zona: ZonaId;
  kioscoId: string;
  kioscoNombre: string;
  kioscoDireccion: string;
  usuarioId: string;
  /** Quién recibe: nombre corto del usuario, por ejemplo "Martina R.". */
  destino: { nombre: string; direccion: string; notas?: string };
  items: ItemPedido[];
  costoEnvio: number;
  propina: number;
  /** Lo que gana el rider por el envío (sin propina). */
  gananciaRider: number;
  cobro: EstadoCobro;
  /** PIN de 4 dígitos. Solo lo ve el usuario. */
  pin: string;
  estado: EstadoPedido;
  riderId?: string;
  creadoEn: Date;
  aceptadoEn?: Date;
  entregadoEn?: Date;
}

export function subtotalProductos(p: Pick<Pedido, 'items'>): number {
  return p.items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
}

export function totalPedido(p: Pick<Pedido, 'items' | 'costoEnvio'>): number {
  return subtotalProductos(p) + p.costoEnvio;
}

/** Código visible del pedido, por ejemplo "#A-1042". */
export function codigoPedido(p: Pick<Pedido, 'numero'>): string {
  return `#A-${p.numero}`;
}

export function cantidadProductos(p: Pick<Pedido, 'items'>): number {
  return p.items.reduce((acc, i) => acc + i.cantidad, 0);
}
