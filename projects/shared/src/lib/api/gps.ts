import { Observable } from 'rxjs';
import { Ubicacion } from '../models/zona';

/** Por qué no hay ubicación: el permiso está bloqueado, o el celular no la pudo obtener (sin señal, GPS apagado). */
export type ErrorGps = 'sin-permiso' | 'no-disponible';

/** GPS del celular. Con un error, falla con un ErrorGps. */
export abstract class Gps {
  /** La ubicación actual. La primera vez el navegador pide permiso. */
  abstract posicion(): Promise<Ubicacion>;
  /** La ubicación cada vez que cambia, mientras haya suscripción. */
  abstract seguir(): Observable<Ubicacion>;
}
