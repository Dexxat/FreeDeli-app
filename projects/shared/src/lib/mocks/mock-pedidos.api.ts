import { Injectable, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, delay, distinctUntilChanged, map, of, throwError } from 'rxjs';
import { PedidosApi, ResultadoEntrega } from '../api/pedidos.api';
import { Pedido } from '../models/pedido';
import { siguienteEstado } from '../rules/pedido.rules';
import { MockDb, RIDER_ACTUAL_ID } from './mock-db';
import { LATENCIA_MOCK } from './mock-riders.api';

const EN_CURSO: Pedido['estado'][] = ['aceptado', 'retirado', 'en-camino'];

@Injectable()
export class MockPedidosApi extends PedidosApi {
  private readonly db = inject(MockDb);
  private readonly pedidos$ = toObservable(this.db.pedidos);

  private buscar(id: string): Pedido | undefined {
    return this.db.pedidos().find((p) => p.id === id);
  }

  private guardar(pedido: Pedido): void {
    this.db.pedidos.update((ps) => ps.map((p) => (p.id === pedido.id ? pedido : p)));
  }

  observar(pedidoId: string): Observable<Pedido | null> {
    return this.pedidos$.pipe(
      map((ps) => ps.find((p) => p.id === pedidoId) ?? null),
      distinctUntilChanged(),
    );
  }

  enCursoDelRider(): Observable<Pedido | null> {
    return this.pedidos$.pipe(
      map((ps) => ps.find((p) => p.riderId === RIDER_ACTUAL_ID && EN_CURSO.includes(p.estado)) ?? null),
      distinctUntilChanged(),
    );
  }

  avanzarEstado(pedidoId: string): Observable<Pedido> {
    const pedido = this.buscar(pedidoId);
    const siguiente = pedido && siguienteEstado(pedido.estado);
    if (!pedido || !siguiente) {
      return throwError(() => new Error('No se puede avanzar este pedido.'));
    }
    const actualizado: Pedido = {
      ...pedido,
      estado: siguiente,
      aceptadoEn: siguiente === 'aceptado' ? new Date() : pedido.aceptadoEn,
    };
    this.guardar(actualizado);
    return of(actualizado).pipe(delay(LATENCIA_MOCK));
  }

  confirmarEntrega(pedidoId: string, pin: string): Observable<ResultadoEntrega> {
    const pedido = this.buscar(pedidoId);
    let resultado: ResultadoEntrega;
    if (!pedido) {
      resultado = { ok: false, motivo: 'no-encontrado' };
    } else if (pedido.estado !== 'en-camino') {
      resultado = { ok: false, motivo: 'estado-invalido' };
    } else if (pedido.pin !== pin) {
      resultado = { ok: false, motivo: 'pin-incorrecto' };
    } else {
      const entregado: Pedido = { ...pedido, estado: 'entregado', entregadoEn: new Date() };
      this.guardar(entregado);
      resultado = { ok: true, pedido: entregado };
    }
    return of(resultado).pipe(delay(LATENCIA_MOCK));
  }
}
