import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Gps } from '../api/gps';
import { Ubicacion } from '../models/zona';

/** Belgrano 845, San Miguel: la casa del usuario de prueba, dentro del área de cobertura. */
export const UBICACION_MOCK: Ubicacion = { lat: -34.543, lng: -58.701 };

/** GPS simulado: siempre en la misma ubicación, sin pedir permiso. */
@Injectable()
export class MockGps extends Gps {
  posicion(): Promise<Ubicacion> {
    return Promise.resolve(UBICACION_MOCK);
  }

  seguir(): Observable<Ubicacion> {
    return of(UBICACION_MOCK);
  }
}
