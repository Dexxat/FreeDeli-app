import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, switchMap } from 'rxjs';
import { CambiosPerfilRider, RidersApi } from '../api/riders.api.js';
import { Pedido } from '../models/pedido.js';
import { PeriodoGanancias, PeriodoHistorial, ResumenGanancias, Rider } from '../models/rider.js';
import { DemandaZona, ZonaId } from '../models/zona.js';
import { API_URL } from './api-url';
import { revivirPedido } from './revivir';

type RiderJson = Omit<Rider, 'riderDesde'> & { riderDesde: string };

/** RidersApi contra la API real. */
@Injectable()
export class HttpRidersApi extends RidersApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);

  perfil(): Observable<Rider> {
    return this.http.get<RiderJson>(`${this.url}/rider`).pipe(map((r) => ({ ...r, riderDesde: new Date(r.riderDesde) })));
  }

  private estado(cambios: { disponible?: boolean; zonas?: ZonaId[] }): Observable<Rider> {
    return this.http.patch(`${this.url}/rider/estado`, cambios).pipe(switchMap(() => this.perfil()));
  }

  setDisponible(disponible: boolean): Observable<Rider> {
    return this.estado({ disponible });
  }

  setZonas(zonas: ZonaId[]): Observable<Rider> {
    return this.estado({ zonas });
  }

  actualizarPerfil(c: CambiosPerfilRider): Observable<Rider> {
    return this.http
      .patch<RiderJson>(`${this.url}/rider/perfil`, {
        nombre: c.nombre,
        dni: c.dni,
        email: c.email,
        telefono: c.telefono,
        vehiculoModelo: c.vehiculo?.modelo,
        patente: c.vehiculo?.patente,
        aliasCbu: c.cobro?.aliasCbu,
        notificaciones: c.preferencias?.notificaciones,
        sonidos8bit: c.preferencias?.sonidos8bit,
      })
      .pipe(map((r) => ({ ...r, riderDesde: new Date(r.riderDesde) })));
  }

  demanda(): Observable<DemandaZona[]> {
    return this.http.get<DemandaZona[]>(`${this.url}/rider/demanda`);
  }

  historial(periodo: PeriodoHistorial): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.url}/rider/historial`, { params: { periodo } }).pipe(map((ps) => ps.map(revivirPedido)));
  }

  ganancias(periodo: PeriodoGanancias): Observable<ResumenGanancias> {
    return this.http.get<ResumenGanancias>(`${this.url}/rider/ganancias`, { params: { periodo } });
  }
}
