import { Kiosco } from './kiosco';
import { EstadoPago, EstadoPedido } from './pedido';

/** Kiosco visto desde FreeDeli Dev, con sus números del día. */
export interface KioscoAdmin extends Kiosco {
  pedidosHoy: number;
  /** Comisión de FreeDeli por los pedidos entregados hoy. */
  comisionHoy: number;
  saldoBajo: boolean;
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
