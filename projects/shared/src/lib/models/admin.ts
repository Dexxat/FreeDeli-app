import { Kiosco } from './kiosco.js';
import { EstadoPago, EstadoPedido, ItemPedido, Pedido } from './pedido.js';
import { Rider } from './rider.js';
import { ZonaId } from './zona.js';

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
  /** La parte del envío que pone el kiosco porque supera el tope que paga el cliente. */
  aporteEnvio: number;
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
  kioscoId: string;
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

/** Rider visto desde FreeDeli Dev. */
export interface RiderAdmin extends Pick<Rider, 'id' | 'nombre' | 'telefono' | 'vehiculo' | 'zonas' | 'disponible' | 'pausado' | 'riderDesde'> {
  entregasHoy: number;
  ganadoHoy: number;
  /** Envío que está haciendo ahora, para el seguimiento. */
  enCurso: Pedido | null;
}

/** Movimiento del saldo prepago de un kiosco. */
export interface MovimientoSaldo {
  id: string;
  kioscoId: string;
  fecha: Date;
  /** Carga: el kiosco transfirió a FreeDeli. Comisión: se descontó al liberarse un pago. */
  tipo: 'carga' | 'comision';
  /** Positivo en cargas, negativo en comisiones. */
  monto: number;
  /** Referencia de la transferencia o código del pedido. */
  referencia: string;
  saldoResultante: number;
}

/** Ganancias del kiosco en un período: lo cobrado menos envíos y comisiones. */
export interface GananciasKiosco {
  periodo: PeriodoAdmin;
  pedidos: number;
  /** Lo que transfirieron los clientes. */
  cobrado: number;
  /** Lo que el kiosco pasó a los riders. */
  envios: number;
  /** Lo que se descontó del saldo por comisiones. */
  comisiones: number;
  /** Lo que le queda al kiosco. */
  neto: number;
  /** Neto por hora (jornada) o por día (semana y mes). */
  barras: { etiqueta: string; monto: number }[];
}

export type DatosKiosco = Pick<Kiosco, 'nombre' | 'direccion' | 'aliasCobro' | 'tiempoEstimadoMin'>;

/** Kiosco o rider que se registró y espera la aprobación del dueño. */
export interface AltaPendiente {
  id: string;
  email: string;
  rol: 'KIOSCO' | 'RIDER';
  creadaEn: Date;
  kiosco?: { nombre: string; direccion: string; zona: ZonaId; aliasCobro: string };
  rider?: { id: string; nombre: string; telefono: string; dni: string; vehiculoModelo: string; patente: string };
}
