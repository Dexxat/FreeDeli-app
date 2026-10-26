import { Observable } from 'rxjs';
import { DemandaZona, ZonaId } from '../models/zona';
import { Pedido } from '../models/pedido';
import { PeriodoGanancias, PeriodoHistorial, ResumenGanancias, Rider } from '../models/rider';

export type CambiosPerfilRider = Partial<Pick<Rider, 'telefono' | 'email' | 'vehiculo' | 'cobro' | 'preferencias'>>;

/** Operaciones del rider que tiene la sesión iniciada. */
export abstract class RidersApi {
  abstract perfil(): Observable<Rider>;
  abstract setDisponible(disponible: boolean): Observable<Rider>;
  /** Rechaza una lista vacía: siempre tiene que quedar al menos una zona. */
  abstract setZonas(zonas: ZonaId[]): Observable<Rider>;
  abstract actualizarPerfil(cambios: CambiosPerfilRider): Observable<Rider>;
  abstract demanda(): Observable<DemandaZona[]>;
  abstract historial(periodo: PeriodoHistorial): Observable<Pedido[]>;
  abstract ganancias(periodo: PeriodoGanancias): Observable<ResumenGanancias>;
}
