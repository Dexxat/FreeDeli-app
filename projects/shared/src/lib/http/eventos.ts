import { Injectable, NgZone, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { EMPTY, Observable, filter, map, share, startWith, switchMap } from 'rxjs';
import { OfertaPedido, Pedido } from '../models/pedido.js';
import { API_URL } from './api-url';
import { revivirOferta, revivirPedido } from './revivir';
import { SesionService } from './sesion';

export type EventoApi =
  | { tipo: 'pedido'; pedido: Pedido }
  | { tipo: 'oferta'; riderId: string; oferta: OfertaPedido | null }
  /** Se abrió (o reabrió) la conexión: conviene volver a pedir el estado. */
  | { tipo: 'conexion' };

/**
 * Eventos en tiempo real de la API (Server-Sent Events). Se reconecta solo si se corta,
 * y se reinicia al cambiar la sesión.
 */
@Injectable({ providedIn: 'root' })
export class EventosCliente {
  private readonly url = inject(API_URL);
  private readonly zona = inject(NgZone);
  private readonly sesion = inject(SesionService);

  readonly eventos$: Observable<EventoApi> = toObservable(this.sesion.token).pipe(
    switchMap((token) => (token && typeof EventSource !== 'undefined' ? this.conectar(token) : EMPTY)),
    share(),
  );

  readonly pedidos$ = this.eventos$.pipe(
    filter((e): e is Extract<EventoApi, { tipo: 'pedido' }> => e.tipo === 'pedido'),
    map((e) => e.pedido),
  );

  readonly conexiones$ = this.eventos$.pipe(filter((e) => e.tipo === 'conexion'));

  /**
   * Carga el estado con `cargar` y lo vuelve a cargar cada vez que se abre la conexión,
   * así no se pierde nada de lo que pasó mientras estaba cortada.
   */
  alConectar<T>(cargar: () => Observable<T>): Observable<T> {
    return this.conexiones$.pipe(startWith(null), switchMap(cargar));
  }

  readonly ofertas$ = this.eventos$.pipe(
    filter((e): e is Extract<EventoApi, { tipo: 'oferta' }> => e.tipo === 'oferta'),
    map((e) => e.oferta),
  );

  private conectar(token: string): Observable<EventoApi> {
    return new Observable<EventoApi>((sub) => {
      const fuente = new EventSource(`${this.url}/eventos?token=${encodeURIComponent(token)}`);
      const recibir = (msg: MessageEvent<string>) => {
        const e = JSON.parse(msg.data) as EventoApi;
        const evento: EventoApi =
          e.tipo === 'pedido'
            ? { tipo: 'pedido', pedido: revivirPedido(e.pedido) }
            : e.tipo === 'oferta'
              ? { ...e, oferta: e.oferta ? revivirOferta(e.oferta) : null }
              : e;
        this.zona.run(() => sub.next(evento));
      };
      fuente.onopen = () => this.zona.run(() => sub.next({ tipo: 'conexion' }));
      fuente.addEventListener('pedido', recibir as EventListener);
      fuente.addEventListener('oferta', recibir as EventListener);
      return () => fuente.close();
    });
  }
}
