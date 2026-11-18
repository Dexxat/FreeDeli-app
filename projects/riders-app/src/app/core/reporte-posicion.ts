import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Gps, PedidosApi, SEGUNDOS_REPORTE_RIDER } from '@freedeli/shared';
import { EMPTY, asyncScheduler, catchError, concatMap, defer, distinctUntilChanged, exhaustMap, filter, from, fromEvent, map, merge, of, retry, switchMap, throttleTime, timer } from 'rxjs';
import { RiderStore } from './rider.store';

const EN_CURSO = ['aceptado', 'retirado', 'en-camino'];
/** Si el GPS falla (sin señal, o la app quedó atrás de Google Maps), vuelve a intentar a los 10 s. */
export const MS_REINTENTO_GPS = 10_000;

/**
 * Mientras el rider lleva un pedido (de Aceptado a Entregado), manda la posición del GPS cada
 * SEGUNDOS_REPORTE_RIDER. El cliente ve cuánto le falta y sirve para saber si pasó la mitad del viaje.
 * Con la app atrás (en Google Maps) el navegador no da la ubicación: apenas el rider vuelve, la manda.
 */
@Injectable({ providedIn: 'root' })
export class ReportePosicion {
  constructor() {
    const api = inject(PedidosApi);
    const gps = inject(Gps);
    const store = inject(RiderStore);
    toObservable(store.rider)
      .pipe(
        map((r) => !!r),
        distinctUntilChanged(),
        switchMap((conSesion) => (conSesion ? api.enCursoDelRider() : of(null))),
        // Solo cambia al tomar otro pedido o al terminarlo: la posición nueva también actualiza el pedido.
        map((p) => (p && EN_CURSO.includes(p.estado) ? p.id : null)),
        distinctUntilChanged(),
        switchMap((id) => (id ? this.posiciones(gps).pipe(concatMap((u) => api.reportarPosicion(id, u).pipe(catchError(() => EMPTY)))) : EMPTY)),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  /** Las posiciones a mandar: las del GPS, como mucho una cada SEGUNDOS_REPORTE_RIDER, y una al volver a la app. */
  private posiciones(gps: Gps) {
    // defer: cada reintento le vuelve a pedir el GPS al navegador.
    const seguidas = defer(() => gps.seguir()).pipe(
      retry({ delay: () => timer(MS_REINTENTO_GPS) }),
      throttleTime(SEGUNDOS_REPORTE_RIDER * 1000, asyncScheduler, { leading: true, trailing: true }),
    );
    const alVolver = fromEvent(document, 'visibilitychange').pipe(
      filter(() => !document.hidden),
      exhaustMap(() => from(gps.posicion()).pipe(catchError(() => EMPTY))),
    );
    return merge(seguidas, alVolver);
  }
}
