import { Injectable, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, delay, distinctUntilChanged, filter, of, throwError } from 'rxjs';
import { KioscosApi } from '../api/kioscos.api';
import { FREEDELI_CONFIG } from '../config/freedeli.config';
import { Kiosco } from '../models/kiosco';
import { Pedido } from '../models/pedido';
import { RiderPublico } from '../models/usuario';
import { Resultado, aprobarRider, confirmarRetiro, confirmarStock, confirmarTransferencia } from '../rules/flujo.rules';
import { ESTADOS_ABIERTOS } from '../rules/pedido.rules';
import { KIOSCO_ACTUAL_ID, MockDb } from './mock-db';
import { LATENCIA_MOCK } from './mock-riders.api';

@Injectable()
export class MockKioscosApi extends KioscosApi {
  private readonly db = inject(MockDb);
  private readonly latencia = inject(LATENCIA_MOCK);
  private readonly config = inject(FREEDELI_CONFIG);

  private readonly kiosco$ = toObservable(computed(() => this.db.kioscos().find((k) => k.id === KIOSCO_ACTUAL_ID)));
  private readonly enVivo$ = toObservable(
    computed(() =>
      this.db
        .pedidos()
        .filter((p) => p.kioscoId === KIOSCO_ACTUAL_ID && ESTADOS_ABIERTOS.includes(p.estado))
        .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime()),
    ),
  );

  private transicion(pedidoId: string, paso: (p: Pedido) => Resultado): Observable<Pedido> {
    const p = this.db.buscarPedido(pedidoId);
    if (!p || p.kioscoId !== KIOSCO_ACTUAL_ID) return throwError(() => new Error('No encontramos el pedido.'));
    const r = paso(p);
    if (!r.ok) return throwError(() => new Error(r.error));
    this.db.guardarPedido(r.pedido);
    return of(r.pedido).pipe(delay(this.latencia));
  }

  kiosco(): Observable<Kiosco> {
    return this.kiosco$.pipe(
      filter((k): k is Kiosco => !!k),
      distinctUntilChanged(),
    );
  }

  pedidosEnVivo(): Observable<Pedido[]> {
    return this.enVivo$;
  }

  rider(riderId: string): Observable<RiderPublico | null> {
    const r = this.db.riders().find((x) => x.id === riderId);
    return of(r ? { nombre: r.nombre, vehiculo: r.vehiculo.modelo, patente: r.vehiculo.patente } : null).pipe(delay(this.latencia));
  }

  confirmarStock(pedidoId: string, faltantes: string[]): Observable<Pedido> {
    return this.transicion(pedidoId, (p) => confirmarStock(p, faltantes, this.config.comisionPorcentaje));
  }

  confirmarTransferencia(pedidoId: string): Observable<Pedido> {
    return this.transicion(pedidoId, confirmarTransferencia);
  }

  aprobarRider(pedidoId: string, aprobado: boolean): Observable<Pedido> {
    return this.transicion(pedidoId, (p) => aprobarRider(p, aprobado, new Date()));
  }

  confirmarEnvio(pedidoId: string): Observable<Pedido> {
    return this.transicion(pedidoId, (p) => confirmarRetiro(p, 'kiosco', new Date()));
  }
}

