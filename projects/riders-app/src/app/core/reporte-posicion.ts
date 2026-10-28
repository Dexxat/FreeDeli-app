import { Injectable, inject } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { Gps, PedidosApi, SEGUNDOS_REPORTE_RIDER } from '@freedeli/shared';
import { EMPTY, asyncScheduler, catchError, concatMap, distinctUntilChanged, map, of, switchMap, throttleTime } from 'rxjs';
import { RiderStore } from './rider.store';

const EN_CURSO = ['aceptado', 'retirado', 'en-camino'];

/**
 * Mientras el rider lleva un pedido (de Aceptado a Entregado), manda la posición del GPS cada
 * SEGUNDOS_REPORTE_RIDER. El cliente ve cuánto le falta y sirve para saber si pasó la mitad del viaje.
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
        switchMap((id) =>
          id
            ? gps.seguir().pipe(
                throttleTime(SEGUNDOS_REPORTE_RIDER * 1000, asyncScheduler, { leading: true, trailing: true }),
                concatMap((u) => api.reportarPosicion(id, u).pipe(catchError(() => EMPTY))),
                // Sin GPS (permiso quitado, sin señal) deja de reportar: es responsabilidad del rider.
                catchError(() => EMPTY),
              )
            : EMPTY,
        ),
        takeUntilDestroyed(),
      )
      .subscribe();
  }
}
