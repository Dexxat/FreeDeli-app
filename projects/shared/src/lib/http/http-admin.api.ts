import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject, debounceTime, map, merge, startWith, switchMap, tap } from 'rxjs';
import { AdminApi } from '../api/admin.api.js';
import {
  AltaPendiente,
  EntregaAdmin,
  FilaMain,
  GananciasAdmin,
  KioscoAdmin,
  MovimientoKiosco,
  MovimientoSaldo,
  PeriodoAdmin,
  ResumenAdmin,
  RiderAdmin,
} from '../models/admin.js';
import { Pedido } from '../models/pedido.js';
import { PeriodoHistorial } from '../models/rider.js';
import { ZonaId } from '../models/zona.js';
import { API_URL } from './api-url';
import { EventosCliente } from './eventos';
import { MovimientoSaldoJson, revivirFechas, revivirMovimiento, revivirPedido } from './revivir';
import { DocumentosRider } from '../rules/documentos.rules.js';

/** AdminApi (FreeDeli Dev) contra la API real. Los datos se refrescan con cada evento. */
@Injectable()
export class HttpAdminApi extends AdminApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly eventos = inject(EventosCliente);
  /** Cambios hechos desde el panel (pausas, cargas y altas). */
  private readonly cambios$ = new Subject<void>();
  /** Cualquier novedad: conexión, pedido o cambio propio. Agrupa ráfagas de eventos. */
  private readonly novedades$ = merge(this.eventos.eventos$, this.cambios$).pipe(debounceTime(250), startWith(null));

  private vivo<T>(cargar: () => Observable<T>): Observable<T> {
    return this.novedades$.pipe(switchMap(cargar));
  }

  private avisar = () => this.cambios$.next();

  resumen(): Observable<ResumenAdmin> {
    return this.vivo(() => this.http.get<ResumenAdmin>(`${this.url}/admin/resumen`));
  }

  kioscos(): Observable<KioscoAdmin[]> {
    return this.vivo(() => this.http.get<KioscoAdmin[]>(`${this.url}/admin/kioscos`));
  }

  kiosco(id: string): Observable<KioscoAdmin | null> {
    return this.vivo(() => this.http.get<KioscoAdmin>(`${this.url}/admin/kioscos/${id}`));
  }

  movimientosKiosco(id: string, periodo: PeriodoHistorial): Observable<MovimientoKiosco[]> {
    return this.http
      .get<MovimientoKiosco[]>(`${this.url}/admin/kioscos/${id}/movimientos`, { params: { periodo } })
      .pipe(map((ms) => ms.map((m) => revivirFechas(m, ['fecha']))));
  }

  pausarKiosco(id: string, pausado: boolean): Observable<KioscoAdmin> {
    return this.http.post<KioscoAdmin>(`${this.url}/admin/kioscos/${id}/pausa`, { pausado }).pipe(tap(this.avisar));
  }

  movimientosSaldo(kioscoId: string): Observable<MovimientoSaldo[]> {
    return this.vivo(() => this.http.get<MovimientoSaldoJson[]>(`${this.url}/admin/kioscos/${kioscoId}/saldo`)).pipe(map((ms) => ms.map(revivirMovimiento)));
  }

  acreditarSaldo(kioscoId: string, monto: number, referencia: string): Observable<KioscoAdmin> {
    return this.http
      .post(`${this.url}/admin/kioscos/${kioscoId}/saldo`, { monto, referencia: referencia || undefined })
      .pipe(
        tap(this.avisar),
        switchMap(() => this.http.get<KioscoAdmin>(`${this.url}/admin/kioscos/${kioscoId}`)),
      );
  }

  pedidosJornada(zonas: ZonaId[]): Observable<FilaMain[]> {
    return this.vivo(() => this.http.get<FilaMain[]>(`${this.url}/admin/pedidos-jornada`, { params: { zonas: zonas.join(',') } }));
  }

  ganancias(periodo: PeriodoAdmin): Observable<GananciasAdmin> {
    return this.http.get<GananciasAdmin>(`${this.url}/admin/ganancias`, { params: { periodo } });
  }

  entregas(periodo: PeriodoAdmin, zonas: ZonaId[]): Observable<EntregaAdmin[]> {
    return this.http
      .get<EntregaAdmin[]>(`${this.url}/admin/entregas`, { params: { periodo, zonas: zonas.join(',') } })
      .pipe(map((es) => es.map((e) => revivirFechas(e, ['fecha', 'aceptadoEn', 'entregadoEn']))));
  }

  rider(id: string): Observable<RiderAdmin | null> {
    return this.vivo(() => this.http.get<RiderAdmin>(`${this.url}/admin/riders/${id}`)).pipe(
      map((r) => ({ ...revivirFechas(r, ['riderDesde']), enCurso: r.enCurso ? revivirPedido(r.enCurso) : null })),
    );
  }

  enviosRider(id: string, periodo: PeriodoAdmin): Observable<FilaMain[]> {
    return this.http.get<FilaMain[]>(`${this.url}/admin/riders/${id}/envios`, { params: { periodo } });
  }

  pausarRider(id: string, pausado: boolean): Observable<RiderAdmin> {
    return this.http.post<RiderAdmin>(`${this.url}/admin/riders/${id}/pausa`, { pausado }).pipe(tap(this.avisar));
  }

  darDeBajaRider(id: string): Observable<RiderAdmin> {
    return this.http.post<RiderAdmin>(`${this.url}/admin/riders/${id}/baja`, {}).pipe(tap(this.avisar));
  }

  reactivarUsuario(id: string): Observable<void> {
    return this.http.post(`${this.url}/admin/usuarios/${id}/reactivar`, {}).pipe(
      tap(this.avisar),
      map(() => undefined),
    );
  }

  entregarPedido(pedidoId: string): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.url}/admin/pedidos/${pedidoId}/entregar`, {}).pipe(map(revivirPedido), tap(this.avisar));
  }

  cancelarPedido(pedidoId: string, motivo: 'rider' | 'dev'): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.url}/admin/pedidos/${pedidoId}/cancelar`, { motivo }).pipe(map(revivirPedido), tap(this.avisar));
  }

  documentosRider(riderId: string): Observable<DocumentosRider> {
    return this.http.get<DocumentosRider>(`${this.url}/admin/riders/${riderId}/documentos`);
  }

  altasPendientes(): Observable<AltaPendiente[]> {
    type Json = Omit<AltaPendiente, 'kiosco'> & { kiosco?: Omit<NonNullable<AltaPendiente['kiosco']>, 'zona'> & { zona: string } };
    const zona = (z: string) => z.toLowerCase().replace('_', '-') as ZonaId;
    return this.vivo(() => this.http.get<Json[]>(`${this.url}/cuentas/pendientes`)).pipe(
      map((as) => as.map((a) => ({ ...revivirFechas(a, ['creadaEn']), kiosco: a.kiosco ? { ...a.kiosco, zona: zona(a.kiosco.zona) } : undefined }))),
    );
  }

  resolverAlta(id: string, aprobada: boolean): Observable<void> {
    return this.http.post(`${this.url}/cuentas/${id}/${aprobada ? 'aprobar' : 'rechazar'}`, {}).pipe(
      tap(this.avisar),
      map(() => undefined),
    );
  }
}
