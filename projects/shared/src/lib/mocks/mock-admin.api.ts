import { Injectable, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, delay, distinctUntilChanged, map, of, throwError } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { AlertaAdmin, KioscoAdmin, MovimientoKiosco, ResumenAdmin } from '../models/admin';
import { codigoPedido } from '../models/pedido';
import { PeriodoHistorial } from '../models/rider';
import { MINUTOS_DEMORA, SALDO_BAJO, movimientoDePedido } from '../rules/admin.rules';
import { COMISION_MINIMA, ESTADOS_ABIERTOS, puedeRecibirPedidos } from '../rules/pedido.rules';
import { enRango, inicioDelDia, rangoPeriodo } from '../rules/periodos.rules';
import { MockDb } from './mock-db';
import { LATENCIA_MOCK } from './mock-riders.api';

@Injectable()
export class MockAdminApi extends AdminApi {
  private readonly db = inject(MockDb);
  private readonly latencia = inject(LATENCIA_MOCK);

  private readonly kioscosAdmin = computed<KioscoAdmin[]>(() => {
    const hoy = inicioDelDia(new Date());
    const pedidosHoy = this.db.pedidos().filter((p) => p.creadoEn >= hoy);
    return this.db.kioscos().map((k) => {
      const propios = pedidosHoy.filter((p) => p.kioscoId === k.id);
      return {
        ...k,
        pedidosHoy: propios.length,
        comisionHoy: propios.filter((p) => p.estado === 'entregado').reduce((a, p) => a + p.comisionFreeDeli, 0),
        saldoBajo: k.saldo < SALDO_BAJO,
        sinSaldo: k.saldo < COMISION_MINIMA,
      };
    });
  });

  private readonly resumenActual = computed<ResumenAdmin>(() => {
    const ahora = new Date();
    const hoy = inicioDelDia(ahora);
    const deHoy = this.db.pedidos().filter((p) => p.creadoEn >= hoy);
    const alertas: AlertaAdmin[] = [];
    for (const k of this.kioscosAdmin().filter((x) => x.saldoBajo)) {
      alertas.push({ tipo: 'saldo-bajo', texto: `${k.nombre} tiene saldo bajo`, ruta: `/kioscos/${k.id}` });
    }
    for (const p of this.db.pedidos().filter((x) => x.estado === 'esperando')) {
      const min = Math.floor((ahora.getTime() - p.creadoEn.getTime()) / 60_000);
      if (min >= MINUTOS_DEMORA) {
        alertas.push({ tipo: 'pedido-demorado', texto: `${codigoPedido(p)} lleva ${min} min sin rider`, ruta: `/kioscos/${p.kioscoId}` });
      }
    }
    return {
      pedidosHoy: deHoy.length,
      entregadosHoy: deHoy.filter((p) => p.estado === 'entregado').length,
      enCurso: this.db.pedidos().filter((p) => ESTADOS_ABIERTOS.includes(p.estado)).length,
      comisionesHoy: deHoy.filter((p) => p.estado === 'entregado').reduce((a, p) => a + p.comisionFreeDeli, 0),
      kioscosAbiertos: this.db.kioscos().filter((k) => puedeRecibirPedidos(k)).length,
      ridersActivos: this.db.riders().filter((r) => r.disponible && !r.pausado).length,
      alertas,
    };
  });

  private readonly resumen$ = toObservable(this.resumenActual);
  private readonly kioscos$ = toObservable(this.kioscosAdmin);

  resumen(): Observable<ResumenAdmin> {
    return this.resumen$;
  }

  kioscos(): Observable<KioscoAdmin[]> {
    return this.kioscos$;
  }

  kiosco(id: string): Observable<KioscoAdmin | null> {
    return this.kioscos$.pipe(
      map((ks) => ks.find((k) => k.id === id) ?? null),
      distinctUntilChanged(),
    );
  }

  movimientosKiosco(id: string, periodo: PeriodoHistorial): Observable<MovimientoKiosco[]> {
    const rango = rangoPeriodo(periodo, new Date());
    const lista = this.db
      .pedidos()
      .filter((p) => p.kioscoId === id && enRango(p.creadoEn, rango))
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime())
      .map(movimientoDePedido);
    return of(lista).pipe(delay(this.latencia));
  }

  pausarKiosco(id: string, pausado: boolean): Observable<KioscoAdmin> {
    if (!this.db.kioscos().some((k) => k.id === id)) return throwError(() => new Error('Kiosco inexistente.'));
    this.db.kioscos.update((ks) => ks.map((k) => (k.id === id ? { ...k, pausado } : k)));
    return of(this.kioscosAdmin().find((k) => k.id === id)!).pipe(delay(this.latencia));
  }
}
