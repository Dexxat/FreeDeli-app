import { Kiosco } from './kiosco.js';
import { EstadoPago, EstadoPedido, ItemPedido, Pedido } from './pedido.js';
import { Rider } from './rider.js';
import { ZonaId } from './zona.js';
export interface KioscoAdmin extends Kiosco {
    pedidosHoy: number;
    comisionHoy: number;
    saldoBajo: boolean;
    sinSaldo: boolean;
}
export interface MovimientoKiosco {
    pedidoId: string;
    numero: number;
    fecha: Date;
    estado: EstadoPedido;
    pago: EstadoPago;
    totalCliente: number;
    envioRider: number;
    comisionFreeDeli: number;
    netoKiosco: number;
}
export interface AlertaAdmin {
    tipo: 'saldo-bajo' | 'pedido-demorado';
    texto: string;
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
export interface FilaMain {
    pedidoId: string;
    numero: number;
    zona: ZonaId;
    kioscoId: string;
    kioscoNombre: string;
    totalKiosco: number;
    estado: EstadoPedido;
    riderId?: string;
    riderNombre?: string;
    gananciaRider: number;
}
export type PeriodoAdmin = 'jornada' | 'semana' | 'mes';
export interface GananciasAdmin {
    periodo: PeriodoAdmin;
    total: number;
    pedidos: number;
    promedioPorPedido: number;
    facturado: number;
    porZona: {
        zona: ZonaId;
        total: number;
        pedidos: number;
    }[];
    barras: {
        etiqueta: string;
        monto: number;
    }[];
}
export interface EntregaAdmin extends MovimientoKiosco {
    zona: ZonaId;
    kioscoNombre: string;
    riderId?: string;
    riderNombre?: string;
    destino: string;
    items: ItemPedido[];
    aceptadoEn?: Date;
    entregadoEn?: Date;
    duracionMin: number | null;
}
export interface RiderAdmin extends Pick<Rider, 'id' | 'nombre' | 'telefono' | 'vehiculo' | 'zonas' | 'disponible' | 'pausado' | 'riderDesde'> {
    entregasHoy: number;
    ganadoHoy: number;
    enCurso: Pedido | null;
}
export type TipoConflicto = 'demora' | 'producto' | 'pago' | 'rider' | 'kiosco' | 'cliente' | 'otro';
export type EstadoConflicto = 'abierto' | 'en-seguimiento' | 'resuelto';
export declare const TIPOS_CONFLICTO: readonly {
    id: TipoConflicto;
    etiqueta: string;
}[];
export interface Conflicto {
    id: string;
    pedidoId?: string;
    numeroPedido?: number;
    tipo: TipoConflicto;
    descripcion: string;
    estado: EstadoConflicto;
    creadoEn: Date;
    resueltoEn?: Date;
    notas: {
        fecha: Date;
        texto: string;
    }[];
}
export interface NuevoConflicto {
    pedidoId?: string;
    tipo: TipoConflicto;
    descripcion: string;
}
export interface MovimientoSaldo {
    id: string;
    kioscoId: string;
    fecha: Date;
    tipo: 'carga' | 'comision';
    monto: number;
    referencia: string;
    saldoResultante: number;
}
export interface GananciasKiosco {
    periodo: PeriodoAdmin;
    pedidos: number;
    cobrado: number;
    envios: number;
    comisiones: number;
    neto: number;
    barras: {
        etiqueta: string;
        monto: number;
    }[];
}
export type DatosKiosco = Pick<Kiosco, 'nombre' | 'direccion' | 'aliasCobro' | 'tiempoEstimadoMin'>;
