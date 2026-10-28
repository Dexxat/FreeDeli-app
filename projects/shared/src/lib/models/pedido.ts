import { ZonaId } from './zona.js';

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

/**
 * Pago por transferencia de alias a alias. No hay efectivo ni tarjetas.
 * - `pendiente`: el cliente todavía no transfirió.
 * - `transferido`: el cliente transfirió; el pago queda retenido hasta la entrega.
 * - `liberado`: el rider ingresó el PIN y se liberan los pagos.
 */
/**
 * En qué paso está un pedido antes de tener rider aprobado (estado `esperando`).
 * - `stock`: el kiosco revisa el stock.
 * - `ajuste`: faltaban productos; el cliente acepta el pedido ajustado o cancela.
 * - `transferencia`: el cliente transfiere; el kiosco confirma que la recibió.
 * - `rider`: se ofrece a los riders.
 * - `aprobacion`: un rider aceptó; el kiosco lo aprueba o lo rechaza.
 */
export type FasePedido = 'stock' | 'ajuste' | 'transferencia' | 'rider' | 'aprobacion';

export type EstadoPago = 'pendiente' | 'transferido' | 'liberado';

/**
 * Por qué se canceló un pedido.
 * - `cliente`: lo canceló el cliente. Cuenta para pausar su cuenta.
 * - `sin-rider`: el cliente no quiso seguir esperando un rider. No cuenta.
 * - `sin-stock`: el kiosco no tenía ninguno de los productos.
 * - `rider`: el rider aceptó y decidió no ir. Cuenta para pausar al rider.
 * - `dev`: lo canceló Dev por otro motivo.
 */
export type MotivoCancelacion = 'cliente' | 'sin-rider' | 'sin-stock' | 'rider' | 'dev';

export interface Cancelacion {
  motivo: MotivoCancelacion;
  /** Lo que el kiosco le devuelve al cliente por transferencia. 0 si todavía no había pagado. */
  reintegro: number;
  /** El rider ya había hecho más de la mitad del viaje: el kiosco le paga el viaje igual. */
  riderCobra: boolean;
  /** Cuando el kiosco avisó que devolvió el dinero. */
  reintegradoEn?: Date;
}

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
  /** Lo que paga el cliente por el envío: el costo real hasta TOPE_ENVIO_CLIENTE. */
  costoEnvio: number;
  /** Distancia del kiosco a la entrega, en km. Define el costo de envío. */
  distanciaKm: number;
  propina: number;
  /** Lo que gana el rider por el envío (sin propina): el costo real del viaje. */
  gananciaRider: number;
  pago: EstadoPago;
  /** Alias del kiosco al que transfiere el cliente. */
  aliasKiosco: string;
  /** Lo que el kiosco le transfiere a FreeDeli al liberarse el pago. */
  comisionFreeDeli: number;
  /**
   * Saldo a favor del cliente (premio de FREEDELI RUSH) usado en este pedido. Se resta de lo que
   * transfiere el cliente y FreeDeli se lo devuelve al kiosco en su saldo: sale de la ganancia de FreeDeli.
   */
  descuentoPremio?: number;
  /** PIN de 4 dígitos. Solo lo ve el usuario. */
  pin: string;
  estado: EstadoPedido;
  /** Solo mientras el estado es `esperando`. */
  fase?: FasePedido;
  /** Productos que el kiosco quitó por falta de stock. */
  itemsQuitados?: ItemPedido[];
  /** Riders que el kiosco rechazó para este pedido: no se les vuelve a ofrecer. */
  ridersRechazados?: string[];
  /** Confirmaciones de retiro: pasa a Retirado cuando están las dos. */
  retiro?: { kiosco?: Date; rider?: Date };
  riderId?: string;
  creadoEn: Date;
  /** Desde cuándo se busca rider, o desde que el cliente eligió seguir esperando. */
  buscandoRiderDesde?: Date;
  aceptadoEn?: Date;
  /** Cuando el rider salió en camino: desde ahí se puede jugar FREEDELI RUSH. */
  enCaminoEn?: Date;
  /** Si el cliente ya ganó la estrella de FREEDELI RUSH con este pedido (una por pedido). */
  estrellaGanada?: boolean;
  entregadoEn?: Date;
  /** Solo en pedidos cancelados. */
  cancelacion?: Cancelacion;
}

export function subtotalProductos(p: Pick<Pedido, 'items'>): number {
  return p.items.reduce((acc, i) => acc + i.cantidad * i.precioUnitario, 0);
}

/** Lo que transfiere el cliente: productos + su parte del envío − saldo a favor usado. */
export function totalPedido(p: Pick<Pedido, 'items' | 'costoEnvio' | 'descuentoPremio'>): number {
  return subtotalProductos(p) + p.costoEnvio - (p.descuentoPremio ?? 0);
}

/** Código visible del pedido, por ejemplo "#A-1042". */
export function codigoPedido(p: Pick<Pedido, 'numero'>): string {
  return `#A-${p.numero}`;
}

export function cantidadProductos(p: Pick<Pedido, 'items'>): number {
  return p.items.reduce((acc, i) => acc + i.cantidad, 0);
}

/**
 * Pedido ofrecido a un rider. Muestra lo justo para decidir:
 * la dirección exacta y las notas aparecen recién al aceptar.
 */
export interface OfertaPedido {
  pedidoId: string;
  numero: number;
  zona: ZonaId;
  kioscoNombre: string;
  kioscoDireccion: string;
  /** Calle y altura redondeada, por ejemplo "Conesa al 1800". */
  entregaAproximada: string;
  cantidadProductos: number;
  gananciaRider: number;
  expiraEn: Date;
}
