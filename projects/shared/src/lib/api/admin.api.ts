import { Observable } from 'rxjs';
import { KioscoAdmin, MovimientoKiosco, ResumenAdmin } from '../models/admin';
import { PeriodoHistorial } from '../models/rider';

/** Operaciones de FreeDeli Dev. Una sola instancia, un solo usuario: el dueño. */
export abstract class AdminApi {
  /** Números del día y alertas. Emite en cada cambio. */
  abstract resumen(): Observable<ResumenAdmin>;
  /** Todos los kioscos, con sus números del día. Emite en cada cambio. */
  abstract kioscos(): Observable<KioscoAdmin[]>;
  abstract kiosco(id: string): Observable<KioscoAdmin | null>;
  /** Pedidos del kiosco en el período, del más nuevo al más viejo. */
  abstract movimientosKiosco(id: string, periodo: PeriodoHistorial): Observable<MovimientoKiosco[]>;
  /** Pausa o reactiva un kiosco. Pausado, no aparece en la app de usuarios. */
  abstract pausarKiosco(id: string, pausado: boolean): Observable<KioscoAdmin>;
}
