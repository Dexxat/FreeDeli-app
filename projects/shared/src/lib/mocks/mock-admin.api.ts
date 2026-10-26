import { Injectable, Injector, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, delay, distinctUntilChanged, map, of, throwError } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { AlertaAdmin, Conflicto, EntregaAdmin, EstadoConflicto, FilaMain, NuevoConflicto, RiderAdmin, GananciasAdmin, KioscoAdmin, MovimientoKiosco, PeriodoAdmin, ResumenAdmin } from '../models/admin';
import { ZONAS, ZonaId } from '../models/zona';
import { Pedido } from '../models/pedido';
import { codigoPedido } from '../models/pedido';
import { PeriodoHistorial } from '../models/rider';
import { MINUTOS_DEMORA, SALDO_BAJO, movimientoDePedido } from '../rules/admin.rules';

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
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
    return {
      pedidoId: p.id,
      numero: p.numero,
      zona: p.zona,
      kioscoId: p.kioscoId,
      kioscoNombre: p.kioscoNombre,
      totalKiosco: movimientoDePedido(p).netoKiosco,
      estado: p.estado,
      riderId: p.riderId,
      riderNombre: this.nombreRider(p.riderId),
      gananciaRider: p.estado === 'cancelado' ? 0 : p.gananciaRider + p.propina,
    };
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
    const ahora = new Date();
    const lista = this.entregados(periodo);
    const total = lista.reduce((a, p) => a + p.comisionFreeDeli, 0);
    const barras: GananciasAdmin['barras'] = [];
    if (periodo === 'jornada') {
      for (let h = 0; h <= ahora.getHours(); h++) {
        const monto = lista.filter((p) => p.creadoEn.getHours() === h).reduce((a, p) => a + p.comisionFreeDeli, 0);
        barras.push({ etiqueta: h.toString().padStart(2, '0'), monto });
      }
    } else {
      const { desde, hasta } = rangoPeriodo(periodo, ahora);
      for (let d = desde; d < hasta; d = sumarDias(d, 1)) {
        const dia = d.getTime();
        const monto = lista.filter((p) => inicioDelDia(p.creadoEn).getTime() === dia).reduce((a, p) => a + p.comisionFreeDeli, 0);
        barras.push({ etiqueta: periodo === 'semana' ? DIAS[d.getDay()] : String(d.getDate()), monto });
      }
    }
    return of({
      periodo,
      total,
      pedidos: lista.length,
      promedioPorPedido: lista.length ? Math.round(total / lista.length) : 0,
      facturado: lista.reduce((a, p) => a + movimientoDePedido(p).totalCliente, 0),
      porZona: ZONAS.map(({ id }) => {
        const deZona = lista.filter((p) => p.zona === id);
        return { zona: id, total: deZona.reduce((a, p) => a + p.comisionFreeDeli, 0), pedidos: deZona.length };
      }),
      barras,
    }).pipe(delay(this.latencia));
  }

  entregas(periodo: PeriodoAdmin, zonas: ZonaId[]): Observable<EntregaAdmin[]> {
    const lista = this.entregados(periodo, zonas).map((p) => ({
      ...movimientoDePedido(p),
      zona: p.zona,
      kioscoNombre: p.kioscoNombre,
      riderId: p.riderId,
      riderNombre: this.nombreRider(p.riderId),
      destino: p.destino.direccion,
      items: p.items,
      aceptadoEn: p.aceptadoEn,
      entregadoEn: p.entregadoEn,
      duracionMin:
        p.aceptadoEn && p.entregadoEn ? Math.round((p.entregadoEn.getTime() - p.aceptadoEn.getTime()) / 60_000) : null,
    }));
    return of(lista).pipe(delay(this.latencia));
  }

  private readonly conflictos$ = toObservable(
    computed(() => {
      const orden: Record<EstadoConflicto, number> = { abierto: 0, 'en-seguimiento': 0, resuelto: 1 };
      return [...this.db.conflictos()].sort((a, b) => orden[a.estado] - orden[b.estado] || b.creadoEn.getTime() - a.creadoEn.getTime());
    }),
  );

  conflictos(): Observable<Conflicto[]> {
    return this.conflictos$;
  }

  registrarConflicto(nuevo: NuevoConflicto): Observable<Conflicto> {
    const descripcion = nuevo.descripcion.trim();
    if (!descripcion) return throwError(() => new Error('Describí el conflicto.'));
    const pedido = nuevo.pedidoId ? this.db.pedidos().find((p) => p.id === nuevo.pedidoId) : undefined;
    const conflicto: Conflicto = {
      id: `c-${Date.now()}-${this.db.conflictos().length + 1}`,
      pedidoId: pedido?.id,
      numeroPedido: pedido?.numero,
      tipo: nuevo.tipo,
      descripcion,
      estado: 'abierto',
      creadoEn: new Date(),
      notas: [],
    };
    this.db.conflictos.update((cs) => [...cs, conflicto]);
    return of(conflicto).pipe(delay(this.latencia));
  }

  actualizarConflicto(id: string, cambios: { estado?: EstadoConflicto; nota?: string }): Observable<Conflicto> {
    const actual = this.db.conflictos().find((c) => c.id === id);
    if (!actual) return throwError(() => new Error('Conflicto inexistente.'));
    const nota = cambios.nota?.trim();
    const estado = cambios.estado ?? actual.estado;
    const actualizado: Conflicto = {
      ...actual,
      estado,
      resueltoEn: estado === 'resuelto' ? (actual.resueltoEn ?? new Date()) : undefined,
      notas: nota ? [...actual.notas, { fecha: new Date(), texto: nota }] : actual.notas,
    };
    this.db.conflictos.update((cs) => cs.map((c) => (c.id === id ? actualizado : c)));
    return of(actualizado).pipe(delay(this.latencia));
  }

  pausarKiosco(id: string, pausado: boolean): Observable<KioscoAdmin> {
    if (!this.db.kioscos().some((k) => k.id === id)) return throwError(() => new Error('Kiosco inexistente.'));
    this.db.kioscos.update((ks) => ks.map((k) => (k.id === id ? { ...k, pausado } : k)));
    return of(this.kioscosAdmin().find((k) => k.id === id)!).pipe(delay(this.latencia));
  }
}
