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
  | { tipo: 'conexion' }
  /** Alta nueva de kiosco o rider (solo Dev). */
  | { tipo: 'alta'; cuentaId: string };

/** Sin noticias del servidor por este tiempo, la conexión se dio por cortada. El servidor late cada 25 s. */
export const MS_SIN_LATIDO = 60_000;

/**
 * Eventos en tiempo real de la API (Server-Sent Events). Se reinicia al cambiar la sesión, y se reconecta
 * si se cortó: al volver a la app (por ejemplo desde Google Maps), al volver la señal o si el servidor
 * dejó de latir. Cada reconexión emite `conexion`, así las pantallas vuelven a pedir el estado.
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
      let fuente: EventSource;
      let ultimaNoticia = 0;
      const emitir = (evento: EventoApi) => this.zona.run(() => sub.next(evento));
      const recibir = (msg: MessageEvent<string>) => {
        ultimaNoticia = Date.now();
        const e = JSON.parse(msg.data) as EventoApi;
        emitir(
          e.tipo === 'pedido'
            ? { tipo: 'pedido', pedido: revivirPedido(e.pedido) }
            : e.tipo === 'oferta'
              ? { ...e, oferta: e.oferta ? revivirOferta(e.oferta) : null }
              : e,
        );
      };
      const abrir = () => {
        fuente?.close();
        ultimaNoticia = Date.now();
        fuente = new EventSource(`${this.url}/eventos?token=${encodeURIComponent(token)}`);
        fuente.onopen = () => {
          ultimaNoticia = Date.now();
          emitir({ tipo: 'conexion' });
        };
        fuente.addEventListener('pedido', recibir as EventListener);
        fuente.addEventListener('oferta', recibir as EventListener);
        fuente.addEventListener('alta', recibir as EventListener);
        fuente.addEventListener('latido', () => (ultimaNoticia = Date.now()));
      };
      /** Reabre si el navegador la cerró o si hace rato que no llega nada (se cortó sin avisar). */
      const revisar = () => {
        if (document.hidden) return;
        if (fuente.readyState === EventSource.CLOSED || Date.now() - ultimaNoticia > MS_SIN_LATIDO) abrir();
      };
      abrir();
      const reloj = setInterval(revisar, 15_000);
      document.addEventListener('visibilitychange', revisar);
      window.addEventListener('online', abrir);
      return () => {
        clearInterval(reloj);
        document.removeEventListener('visibilitychange', revisar);
        window.removeEventListener('online', abrir);
        fuente.close();
      };
    });
  }
}
