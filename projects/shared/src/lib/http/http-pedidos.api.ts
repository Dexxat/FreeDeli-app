import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, distinctUntilChanged, filter, map, of, scan, startWith, switchMap, tap, throwError } from 'rxjs';
import { PedidosApi, ResultadoAceptar, ResultadoEntrega } from '../api/pedidos.api.js';
import { OfertaPedido, Pedido } from '../models/pedido.js';
import { Ubicacion } from '../models/zona.js';
import { API_URL } from './api-url';
import { EventosCliente } from './eventos';
import { revivirOferta, revivirPedido } from './revivir';

/** El pedido es del rider: aceptado y en curso, o esperando la aprobación del kiosco. */
function esDelRider(p: Pedido, riderId: string | undefined): boolean {
  if (!riderId || p.riderId !== riderId) return false;
  return ['aceptado', 'retirado', 'en-camino'].includes(p.estado) || (p.estado === 'esperando' && p.fase === 'aprobacion');
}

/** PedidosApi del lado del rider, contra la API real y con eventos en tiempo real. */
@Injectable()
export class HttpPedidosApi extends PedidosApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly eventos = inject(EventosCliente);
  /** Último estado conocido de cada pedido, para saber qué paso sigue. */
  private readonly conocidos = new Map<string, Pedido>();
  private riderId?: string;

  private recordar = (p: Pedido | null) => {
    if (p) this.conocidos.set(p.id, p);
  };

  observar(pedidoId: string): Observable<Pedido | null> {
    return this.eventos.pedidos$.pipe(
      filter((p) => p.id === pedidoId),
      startWith(this.conocidos.get(pedidoId) ?? null),
      distinctUntilChanged(),
    );
  }

  enCursoDelRider(): Observable<Pedido | null> {
    return this.eventos.alConectar(() => this.http.get<{ id: string } | null>(`${this.url}/rider`)).pipe(
      tap((r) => (this.riderId = r?.id)),
      switchMap(() => this.http.get<Pedido | null>(`${this.url}/rider/pedido`)),
      map((p) => (p ? revivirPedido(p) : null)),
      switchMap((inicial) =>
        this.eventos.pedidos$.pipe(
          scan((actual: Pedido | null, p: Pedido) => {
            if (esDelRider(p, this.riderId)) return p;
            if (actual?.id !== p.id) return actual;
            // Se entregó, se canceló o el kiosco eligió otro rider: observar() da el estado final.
            this.recordar(p);
            return null;
          }, inicial),
          startWith(inicial),
        ),
      ),
      tap(this.recordar),
      distinctUntilChanged(),
    );
  }

  ofertaParaRider(): Observable<OfertaPedido | null> {
    return this.eventos.alConectar(() => this.http.get<OfertaPedido | null>(`${this.url}/rider/oferta`)).pipe(
      map((o) => (o?.pedidoId ? revivirOferta(o) : null)),
      switchMap((inicial) => this.eventos.ofertas$.pipe(startWith(inicial))),
      distinctUntilChanged((a, b) => a?.pedidoId === b?.pedidoId && a?.expiraEn.getTime() === b?.expiraEn.getTime()),
    );
  }

  aceptarOferta(pedidoId: string): Observable<ResultadoAceptar> {
    return this.http.post<Pedido>(`${this.url}/rider/ofertas/${pedidoId}/aceptar`, {}).pipe(
      map((p): ResultadoAceptar => {
        const pedido = revivirPedido(p);
        this.recordar(pedido);
        return { ok: true, pedido };
      }),
      catchError((e: HttpErrorResponse) =>
        of<ResultadoAceptar>({ ok: false, motivo: e.status === 404 ? 'vencida' : e.status === 409 ? 'ya-tomado' : 'no-encontrado' }),
      ),
    );
  }

  rechazarOferta(pedidoId: string): Observable<void> {
    return this.http.post(`${this.url}/rider/ofertas/${pedidoId}/rechazar`, {}).pipe(map(() => undefined));
  }

  avanzarEstado(pedidoId: string): Observable<Pedido> {
    const estado = this.conocidos.get(pedidoId)?.estado;
    const paso = estado === 'aceptado' ? 'retiro' : estado === 'retirado' ? 'en-camino' : null;
    if (!paso) return throwError(() => new Error('No se puede avanzar este pedido.'));
    return this.http.post<Pedido>(`${this.url}/rider/pedidos/${pedidoId}/${paso}`, {}).pipe(map(revivirPedido), tap((p) => this.recordar(p)));
  }

  reportarPosicion(pedidoId: string, ubicacion: Ubicacion): Observable<void> {
    return this.http.post(`${this.url}/rider/pedidos/${pedidoId}/posicion`, ubicacion).pipe(map(() => undefined));
  }

  confirmarEntrega(pedidoId: string, pin: string): Observable<ResultadoEntrega> {
    return this.http.post<Pedido>(`${this.url}/rider/pedidos/${pedidoId}/entregar`, { pin }).pipe(
      map((p): ResultadoEntrega => ({ ok: true, pedido: revivirPedido(p) })),
      catchError((e: HttpErrorResponse) => {
        if (e.status === 404) return of<ResultadoEntrega>({ ok: false, motivo: 'no-encontrado' });
        if (e.status === 409 && e.error?.message === 'PIN incorrecto.') return of<ResultadoEntrega>({ ok: false, motivo: 'pin-incorrecto' });
        if (e.status === 409) return of<ResultadoEntrega>({ ok: false, motivo: 'estado-invalido' });
        return throwError(() => e);
      }),
    );
  }
}
