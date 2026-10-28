import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { ErrorGps, Gps } from '../api/gps.js';
import { Ubicacion } from '../models/zona.js';

const OPCIONES: PositionOptions = { enableHighAccuracy: true, timeout: 20_000, maximumAge: 30_000 };

const NO_DISPONIBLE: ErrorGps = 'no-disponible';

const aUbicacion = (p: GeolocationPosition): Ubicacion => ({ lat: p.coords.latitude, lng: p.coords.longitude });
const aError = (e: GeolocationPositionError): ErrorGps => (e.code === e.PERMISSION_DENIED ? 'sin-permiso' : 'no-disponible');

/** El GPS del celular, con la API de geolocalización del navegador. Necesita HTTPS (o localhost). */
@Injectable()
export class GpsNavegador extends Gps {
  posicion(): Promise<Ubicacion> {
    return new Promise((resolver, rechazar) => {
      if (!navigator.geolocation) return rechazar(NO_DISPONIBLE);
      navigator.geolocation.getCurrentPosition((p) => resolver(aUbicacion(p)), (e) => rechazar(aError(e)), OPCIONES);
    });
  }

  seguir(): Observable<Ubicacion> {
    return new Observable((sub) => {
      if (!navigator.geolocation) return sub.error(NO_DISPONIBLE);
      const id = navigator.geolocation.watchPosition((p) => sub.next(aUbicacion(p)), (e) => sub.error(aError(e)), OPCIONES);
      return () => navigator.geolocation.clearWatch(id);
    });
  }
}
