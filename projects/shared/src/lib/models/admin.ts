import { Kiosco } from './kiosco';
import { EstadoPago, EstadoPedido, ItemPedido } from './pedido';
import { ZonaId } from './zona';

/** Kiosco visto desde FreeDeli Dev, con sus números del día. */
export interface KioscoAdmin extends Kiosco {
  pedidosHoy: number;
  /** Comisión de FreeDeli por los pedidos entregados hoy. */
  comisionHoy: number;
  saldoBajo: boolean;
  /** Sin saldo para la comisión mínima: no recibe pedidos. */
  sinSaldo: boolean;
}

/** Un pedido desde el punto de vista del dinero. */
export interface MovimientoKiosco {
  pedidoId: string;
  numero: number;
  fecha: Date;
  estado: EstadoPedido;
  pago: EstadoPago;
  /** Lo que transfirió el cliente: productos + envío. */
  totalCliente: number;
  /** Lo que el kiosco le transfiere al rider. */
  envioRider: number;
  /** Lo que el kiosco le transfiere a FreeDeli. */
  comisionFreeDeli: number;
  /** Lo que le queda al kiosco. */
  netoKiosco: number;
}

export interface AlertaAdmin {
  tipo: 'saldo-bajo' | 'pedido-demorado';
  texto: string;
  /** Ruta del panel donde se resuelve. */
  ruta: string;
}

export interface ResumenAdmin {
  pedidosHoy: number;
  entregadosHoy: number;
  enCurso: number;
  comisionesHoy: number;
  kioscosAbiertos: number;
  ridersActivos: number;
  alertas: AlertaAdmin[];
}

/** Fila de MAIN: un pedido de la jornada. */
export interface FilaMain {
  pedidoId: string;
  numero: number;
  zona: ZonaId;
  kioscoNombre: string;
  /** Lo que le queda al kiosco. */
  totalKiosco: number;
  estado: EstadoPedido;
  riderId?: string;
  riderNombre?: string;
  /** Envío + propina. Se cobra al entregar. */
  gananciaRider: number;
}

export type PeriodoAdmin = 'jornada' | 'semana' | 'mes';

export interface GananciasAdmin {
  periodo: PeriodoAdmin;
  /** Comisiones de FreeDeli por pedidos entregados. */
  total: number;
  pedidos: number;
  promedioPorPedido: number;
  /** Lo que transfirieron los clientes en esos pedidos. */
  facturado: number;
  porZona: { zona: ZonaId; total: number; pedidos: number }[];
  /** Por hora (jornada) o por día (semana y mes). */
  barras: { etiqueta: string; monto: number }[];
}

/** Una entrega finalizada con todo su detalle. */
export interface EntregaAdmin extends MovimientoKiosco {
  zona: ZonaId;
  kioscoNombre: string;
  riderId?: string;
  riderNombre?: string;
  destino: string;
  items: ItemPedido[];
  aceptadoEn?: Date;
  entregadoEn?: Date;
  /** Minutos desde que el rider aceptó hasta que entregó. */
  duracionMin: number | null;
}
