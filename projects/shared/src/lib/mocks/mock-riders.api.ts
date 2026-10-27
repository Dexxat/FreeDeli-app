import { Injectable, InjectionToken, inject } from '@angular/core';
import { Observable, delay, of, throwError } from 'rxjs';
import { CambiosPerfilRider, RidersApi } from '../api/riders.api';
import { Pedido } from '../models/pedido';
import { PeriodoGanancias, PeriodoHistorial, ResumenGanancias, Rider } from '../models/rider';
import { DemandaZona, ZonaId } from '../models/zona';
import { resumirGanancias } from '../rules/ganancias.rules';
import { enRango, rangoPeriodo } from '../rules/periodos.rules';
import { normalizarDni } from '../rules/validaciones.rules';
import { MockDb, RIDER_ACTUAL_ID } from './mock-db';

/** Latencia simulada de red, en ms. En tests conviene 0. */
export const LATENCIA_MOCK = new InjectionToken<number>('LATENCIA_MOCK', { factory: () => 150 });

@Injectable()
export class MockRidersApi extends RidersApi {
  private readonly db = inject(MockDb);
  private readonly latencia = inject(LATENCIA_MOCK);

  private actual(): Rider {
    return this.db.riders().find((r) => r.id === RIDER_ACTUAL_ID)!;
  }

  private actualizar(cambios: Partial<Rider>): Observable<Rider> {
    this.db.riders.update((rs) => rs.map((r) => (r.id === RIDER_ACTUAL_ID ? { ...r, ...cambios } : r)));
    return of(this.actual()).pipe(delay(this.latencia));
  }

  perfil(): Observable<Rider> {
    return of(this.actual()).pipe(delay(this.latencia));
  }

  setDisponible(disponible: boolean): Observable<Rider> {
    if (disponible && this.actual().pausado) {
      return throwError(() => new Error('Tu cuenta está pausada. Escribinos por WhatsApp.'));
    }
    return this.actualizar({ disponible });
  }

  setZonas(zonas: ZonaId[]): Observable<Rider> {
    if (zonas.length === 0) {
      return throwError(() => new Error('Elegí al menos una zona.'));
    }
    return this.actualizar({ zonas: [...zonas] });
  }

  actualizarPerfil(cambios: CambiosPerfilRider): Observable<Rider> {
    return this.actualizar({ ...cambios, ...(cambios.dni && { dni: normalizarDni(cambios.dni) }) });
  }

  demanda(): Observable<DemandaZona[]> {
    return of(this.db.demanda()).pipe(delay(this.latencia));
  }

  historial(periodo: PeriodoHistorial): Observable<Pedido[]> {
    const rango = rangoPeriodo(periodo, new Date());
    const lista = this.db
      .pedidos()
      .filter((p) => p.riderId === RIDER_ACTUAL_ID && (p.estado === 'entregado' || p.estado === 'cancelado'))
      .filter((p) => enRango(p.creadoEn, rango))
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
    return of(lista).pipe(delay(this.latencia));
  }

  ganancias(periodo: PeriodoGanancias): Observable<ResumenGanancias> {
    const propios = this.db.pedidos().filter((p) => p.riderId === RIDER_ACTUAL_ID);
    return of(resumirGanancias(propios, periodo, new Date(), this.db.horasOnline[periodo])).pipe(delay(this.latencia));
  }
}
