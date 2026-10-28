import { Observable } from 'rxjs';
import { AltaPendiente, MovimientoSaldo, EntregaAdmin, FilaMain, RiderAdmin, GananciasAdmin, KioscoAdmin, MovimientoKiosco, PeriodoAdmin, ResumenAdmin } from '../models/admin';
import { Pedido } from '../models/pedido';
import { ZonaId } from '../models/zona';
import { PeriodoHistorial } from '../models/rider';
import { DocumentosRider } from '../rules/documentos.rules';

/** Operaciones de FreeDeli Dev. Una sola instancia, un solo usuario: el dueño. */
export abstract class AdminApi {
  /** Números del día y alertas. Emite en cada cambio. */
  abstract resumen(): Observable<ResumenAdmin>;
  /** Todos los kioscos, con sus números del día. Emite en cada cambio. */
  abstract kioscos(): Observable<KioscoAdmin[]>;
  abstract kiosco(id: string): Observable<KioscoAdmin | null>;
  /** Pedidos del kiosco en el período, del más nuevo al más viejo. */
  abstract movimientosKiosco(id: string, periodo: PeriodoHistorial): Observable<MovimientoKiosco[]>;
  /** MAIN: pedidos de la jornada de las zonas elegidas, del más nuevo al más viejo. Emite en cada cambio. */
  abstract pedidosJornada(zonas: ZonaId[]): Observable<FilaMain[]>;
  /** Comisiones de FreeDeli por pedidos entregados en el período. */
  abstract ganancias(periodo: PeriodoAdmin): Observable<GananciasAdmin>;
  /** Entregas finalizadas del período, de la más nueva a la más vieja. */
  abstract entregas(periodo: PeriodoAdmin, zonas: ZonaId[]): Observable<EntregaAdmin[]>;
  /** Ficha del rider con su envío en curso. Emite en cada cambio. */
  abstract rider(id: string): Observable<RiderAdmin | null>;
  /** Envíos del rider en el período, del más nuevo al más viejo. */
  abstract enviosRider(id: string, periodo: PeriodoAdmin): Observable<FilaMain[]>;
  /** Pausa o reactiva un rider. Pausado, pasa a OFF y no puede volver a conectarse. Reactivarlo reinicia sus abandonos. */
  abstract pausarRider(id: string, pausado: boolean): Observable<RiderAdmin>;
  /** Da de baja al rider: ya no puede ingresar. */
  abstract darDeBajaRider(id: string): Observable<RiderAdmin>;
  /** Reactiva a un cliente pausado por cancelaciones. */
  abstract reactivarUsuario(id: string): Observable<void>;
  /** Cierra como entregado un pedido que el rider entregó sin poder ingresar el PIN. */
  abstract entregarPedido(pedidoId: string): Observable<Pedido>;
  /** Cancela un pedido abierto con reintegro total. `rider`: el rider decidió no ir. */
  abstract cancelarPedido(pedidoId: string, motivo: 'rider' | 'dev'): Observable<Pedido>;
  /** Movimientos del saldo prepago del kiosco, del más nuevo al más viejo. Emite en cada cambio. */
  abstract movimientosSaldo(kioscoId: string): Observable<MovimientoSaldo[]>;
  /** Acredita una carga de saldo: el kiosco transfirió ese monto al alias de FreeDeli. */
  abstract acreditarSaldo(kioscoId: string, monto: number, referencia: string): Observable<KioscoAdmin>;
  /** Kioscos y riders esperando aprobación. Emite en cada cambio. */
  /** Fotos del seguro y la licencia de un rider, para revisarlas antes de aprobarlo. */
  abstract documentosRider(riderId: string): Observable<DocumentosRider>;
  abstract altasPendientes(): Observable<AltaPendiente[]>;
  abstract resolverAlta(id: string, aprobada: boolean): Observable<void>;
  /** Pausa o reactiva un kiosco. Pausado, no aparece en la app de usuarios. */
  abstract pausarKiosco(id: string, pausado: boolean): Observable<KioscoAdmin>;
}
