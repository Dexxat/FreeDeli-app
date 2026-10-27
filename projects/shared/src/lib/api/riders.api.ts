import { Observable } from 'rxjs';
import { DemandaZona, ZonaId } from '../models/zona';
import { Pedido } from '../models/pedido';
import { PeriodoGanancias, PeriodoHistorial, ResumenGanancias, Rider } from '../models/rider';
import { DocumentosRider, TipoDocumento } from '../rules/documentos.rules';

export type CambiosPerfilRider = Partial<Pick<Rider, 'nombre' | 'dni' | 'telefono' | 'email' | 'vehiculo' | 'cobro' | 'preferencias'>>;

/** Operaciones del rider que tiene la sesión iniciada. */
export abstract class RidersApi {
  abstract perfil(): Observable<Rider>;
  abstract setDisponible(disponible: boolean): Observable<Rider>;
  /** Rechaza una lista vacía: siempre tiene que quedar al menos una zona. */
  abstract setZonas(zonas: ZonaId[]): Observable<Rider>;
  abstract actualizarPerfil(cambios: CambiosPerfilRider): Observable<Rider>;
  /** Fotos del seguro y la licencia que cargó en el alta. */
  abstract documentos(): Observable<DocumentosRider>;
  abstract actualizarDocumento(tipo: TipoDocumento, imagen: string): Observable<DocumentosRider>;
  abstract demanda(): Observable<DemandaZona[]>;
  abstract historial(periodo: PeriodoHistorial): Observable<Pedido[]>;
  abstract ganancias(periodo: PeriodoGanancias): Observable<ResumenGanancias>;
}
