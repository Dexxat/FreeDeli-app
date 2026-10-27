import { Injectable, Injector, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, delay, distinctUntilChanged, map, of, throwError } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { AlertaAdmin, AltaPendiente, MovimientoSaldo, EntregaAdmin, FilaMain, RiderAdmin, GananciasAdmin, KioscoAdmin, MovimientoKiosco, PeriodoAdmin, ResumenAdmin } from '../models/admin';
import { ZONAS, ZonaId } from '../models/zona';
import { Pedido } from '../models/pedido';
import { codigoPedido } from '../models/pedido';
import { PeriodoHistorial } from '../models/rider';
import { MINUTOS_DEMORA, SALDO_BAJO, movimientoDePedido } from '../rules/admin.rules';
import { entregaAdmin, filaMain, gananciasAdmin } from '../rules/reportes.rules';

import { COMISION_MINIMA, ESTADOS_ABIERTOS, puedeRecibirPedidos } from '../rules/pedido.rules';
import { enRango, inicioDelDia, rangoPeriodo, sumarDias } from '../rules/periodos.rules';
import { MockDb } from './mock-db';
import { LATENCIA_MOCK } from './mock-riders.api';

@Injectable()
export class MockAdminApi extends AdminApi {
  private readonly db = inject(MockDb);
  private readonly latencia = inject(LATENCIA_MOCK);
  private readonly injector = inject(Injector);

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

  private nombreRider(id?: string): string | undefined {
    return id ? this.db.riders().find((r) => r.id === id)?.nombre : undefined;
  }

  private fila(p: Pedido): FilaMain {
    return filaMain(p, this.nombreRider(p.riderId));
  }

  pedidosJornada(zonas: ZonaId[]): Observable<FilaMain[]> {
    return toObservable(this.db.pedidos, { injector: this.injector }).pipe(
      map((ps) => {
        const hoy = inicioDelDia(new Date());
        return ps
          .filter((p) => p.creadoEn >= hoy && zonas.includes(p.zona))
          .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime())
          .map((p) => this.fila(p));
      }),
    );
  }

  private readonly ridersAdmin = computed<RiderAdmin[]>(() => {
    const hoy = inicioDelDia(new Date());
    const pedidos = this.db.pedidos();
    return this.db.riders().map((r) => {
      const entregadosHoy = pedidos.filter((p) => p.riderId === r.id && p.estado === 'entregado' && p.creadoEn >= hoy);
      return {
        id: r.id,
        nombre: r.nombre,
        telefono: r.telefono,
        vehiculo: r.vehiculo,
        zonas: r.zonas,
        disponible: r.disponible,
        pausado: r.pausado,
        riderDesde: r.riderDesde,
        entregasHoy: entregadosHoy.length,
        ganadoHoy: entregadosHoy.reduce((a, p) => a + p.gananciaRider + p.propina, 0),
        enCurso: pedidos.find((p) => p.riderId === r.id && ['aceptado', 'retirado', 'en-camino'].includes(p.estado)) ?? null,
      };
    });
  });
  private readonly riders$ = toObservable(this.ridersAdmin);

  rider(id: string): Observable<RiderAdmin | null> {
    return this.riders$.pipe(
      map((rs) => rs.find((r) => r.id === id) ?? null),
      distinctUntilChanged(),
    );
  }

  enviosRider(id: string, periodo: PeriodoAdmin): Observable<FilaMain[]> {
    const rango = rangoPeriodo(periodo, new Date());
    const lista = this.db
      .pedidos()
      .filter((p) => p.riderId === id && enRango(p.creadoEn, rango))
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime())
      .map((p) => this.fila(p));
    return of(lista).pipe(delay(this.latencia));
  }

  pausarRider(id: string, pausado: boolean): Observable<RiderAdmin> {
    if (!this.db.riders().some((r) => r.id === id)) return throwError(() => new Error('Rider inexistente.'));
    this.db.riders.update((rs) => rs.map((r) => (r.id === id ? { ...r, pausado, disponible: pausado ? false : r.disponible } : r)));
    return of(this.ridersAdmin().find((r) => r.id === id)!).pipe(delay(this.latencia));
  }

  private entregados(periodo: PeriodoAdmin, zonas?: ZonaId[]): Pedido[] {
    const rango = rangoPeriodo(periodo, new Date());
    return this.db
      .pedidos()
      .filter((p) => p.estado === 'entregado' && enRango(p.creadoEn, rango) && (!zonas || zonas.includes(p.zona)))
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
  }

  ganancias(periodo: PeriodoAdmin): Observable<GananciasAdmin> {
    return of(gananciasAdmin(this.db.pedidos(), periodo, new Date())).pipe(delay(this.latencia));
  }

  entregas(periodo: PeriodoAdmin, zonas: ZonaId[]): Observable<EntregaAdmin[]> {
    const lista = this.entregados(periodo, zonas).map((p) => entregaAdmin(p, this.nombreRider(p.riderId)));
    return of(lista).pipe(delay(this.latencia));
  }

  movimientosSaldo(kioscoId: string): Observable<MovimientoSaldo[]> {
    return toObservable(this.db.movimientosSaldo, { injector: this.injector }).pipe(
      map((ms) => ms.filter((m) => m.kioscoId === kioscoId).sort((a, b) => b.fecha.getTime() - a.fecha.getTime() || b.id.localeCompare(a.id))),
    );
  }

  acreditarSaldo(kioscoId: string, monto: number, referencia: string): Observable<KioscoAdmin> {
    if (!this.db.kioscos().some((k) => k.id === kioscoId)) return throwError(() => new Error('Kiosco inexistente.'));
    if (!Number.isFinite(monto) || monto <= 0) return throwError(() => new Error('Ingresá un monto mayor a cero.'));
    this.db.moverSaldo(kioscoId, 'carga', Math.round(monto), referencia.trim() || 'Transferencia a FreeDeli');
    return of(this.kioscosAdmin().find((k) => k.id === kioscoId)!).pipe(delay(this.latencia));
  }

  /** Altas de ejemplo para ver la pantalla con datos simulados. */
  private readonly altas = signal<AltaPendiente[]>([
    {
      id: 'alta-1',
      email: 'kiosco.nuevo@example.com',
      rol: 'KIOSCO',
      creadaEn: new Date(Date.now() - 3 * 3_600_000),
      kiosco: { nombre: 'Kiosco La Plaza', direccion: 'Italia 455', zona: 'muniz', aliasCobro: 'laplaza.kiosco' },
    },
    {
      id: 'alta-2',
      email: 'rider.nuevo@example.com',
      rol: 'RIDER',
      creadaEn: new Date(Date.now() - 40 * 60_000),
      rider: { nombre: 'Julieta Sosa', telefono: '11 5555-0777', dni: '41222333', vehiculoModelo: 'Honda CG 150', patente: 'A321JKL' },
    },
  ]);
  private readonly altas$ = toObservable(this.altas);

  altasPendientes(): Observable<AltaPendiente[]> {
    return this.altas$;
  }

  resolverAlta(id: string, _aprobada: boolean): Observable<void> {
    this.altas.update((as) => as.filter((a) => a.id !== id));
    return of(undefined).pipe(delay(this.latencia));
  }

  pausarKiosco(id: string, pausado: boolean): Observable<KioscoAdmin> {
    if (!this.db.kioscos().some((k) => k.id === id)) return throwError(() => new Error('Kiosco inexistente.'));
    this.db.kioscos.update((ks) => ks.map((k) => (k.id === id ? { ...k, pausado } : k)));
    return of(this.kioscosAdmin().find((k) => k.id === id)!).pipe(delay(this.latencia));
  }
}
