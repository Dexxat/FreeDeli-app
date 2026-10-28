import { Injectable, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, delay, distinctUntilChanged, filter, of, throwError } from 'rxjs';
import { KioscosApi } from '../api/kioscos.api';
import { FREEDELI_CONFIG } from '../config/freedeli.config';
import { DatosKiosco, GananciasKiosco, MovimientoSaldo, PeriodoAdmin } from '../models/admin';
import { Kiosco, Producto } from '../models/kiosco';
import { PeriodoHistorial } from '../models/rider';
import { gananciasKiosco } from '../rules/reportes.rules';
import { enRango, rangoPeriodo } from '../rules/periodos.rules';
import { aliasCbuValido } from '../rules/validaciones.rules';
import { Pedido } from '../models/pedido';
import { RiderPublico } from '../models/usuario';
import { Resultado, aprobarRider, confirmarRetiro, confirmarStock, confirmarTransferencia, marcarReintegrado } from '../rules/flujo.rules';
import { reintegroPendiente } from '../rules/cancelacion.rules';
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
        .filter((p) => p.kioscoId === KIOSCO_ACTUAL_ID && (ESTADOS_ABIERTOS.includes(p.estado) || reintegroPendiente(p)))
        .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime()),
    ),
  );

  private readonly saldo$ = toObservable(
    computed(() =>
      this.db
        .movimientosSaldo()
        .filter((m) => m.kioscoId === KIOSCO_ACTUAL_ID)
        .sort((a, b) => b.fecha.getTime() - a.fecha.getTime() || b.id.localeCompare(a.id)),
    ),
  );
  private readonly catalogo$ = toObservable(
    computed(() => this.db.productos().filter((p) => p.kioscoId === KIOSCO_ACTUAL_ID).sort((a, b) => a.nombre.localeCompare(b.nombre))),
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
    return this.transicion(pedidoId, (p) => confirmarTransferencia(p, new Date()));
  }

  aprobarRider(pedidoId: string, aprobado: boolean): Observable<Pedido> {
    return this.transicion(pedidoId, (p) => aprobarRider(p, aprobado, new Date()));
  }

  confirmarEnvio(pedidoId: string): Observable<Pedido> {
    return this.transicion(pedidoId, (p) => confirmarRetiro(p, 'kiosco', new Date()));
  }

  marcarReintegrado(pedidoId: string): Observable<Pedido> {
    return this.transicion(pedidoId, (p) => marcarReintegrado(p, new Date()));
  }

  private propios(): Pedido[] {
    return this.db.pedidos().filter((p) => p.kioscoId === KIOSCO_ACTUAL_ID);
  }

  historial(periodo: PeriodoHistorial): Observable<Pedido[]> {
    const rango = rangoPeriodo(periodo, new Date());
    const lista = this.propios()
      .filter((p) => (p.estado === 'entregado' || p.estado === 'cancelado') && enRango(p.creadoEn, rango))
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
    return of(lista).pipe(delay(this.latencia));
  }

  ganancias(periodo: PeriodoAdmin): Observable<GananciasKiosco> {
    return of(gananciasKiosco(this.propios(), periodo, new Date())).pipe(delay(this.latencia));
  }

  actualizarDatos(datos: DatosKiosco): Observable<Kiosco> {
    const nombre = datos.nombre.trim();
    const direccion = datos.direccion.trim();
    if (nombre.length < 3) return throwError(() => new Error('Ingresá el nombre del kiosco.'));
    if (!/\d/.test(direccion)) return throwError(() => new Error('Ingresá la calle y la altura.'));
    if (!aliasCbuValido(datos.aliasCobro)) return throwError(() => new Error('Alias de 6 a 20 caracteres o CBU de 22 dígitos.'));
    if (!Number.isInteger(datos.tiempoEstimadoMin) || datos.tiempoEstimadoMin < 5 || datos.tiempoEstimadoMin > 120) {
      return throwError(() => new Error('El tiempo estimado va de 5 a 120 minutos.'));
    }
    const actual = this.db.kioscos().find((k) => k.id === KIOSCO_ACTUAL_ID)!;
    const ubicacion = direccion === actual.direccion ? actual.ubicacion : this.db.geolocalizar(direccion, actual.zona);
    const actualizado: Kiosco = { ...actual, nombre, direccion, ubicacion, aliasCobro: datos.aliasCobro.trim(), tiempoEstimadoMin: datos.tiempoEstimadoMin };
    this.db.kioscos.update((ks) => ks.map((k) => (k.id === KIOSCO_ACTUAL_ID ? actualizado : k)));
    return of(actualizado).pipe(delay(this.latencia));
  }

  movimientosSaldo(): Observable<MovimientoSaldo[]> {
    return this.saldo$;
  }

  catalogo(): Observable<Producto[]> {
    return this.catalogo$;
  }

  guardarProducto(producto: Omit<Producto, 'id' | 'kioscoId'> & { id?: string }): Observable<Producto> {
    const nombre = producto.nombre.trim();
    if (nombre.length < 2) return throwError(() => new Error('Ingresá el nombre del producto.'));
    if (!Number.isInteger(producto.precio) || producto.precio <= 0) return throwError(() => new Error('El precio tiene que ser mayor a cero.'));
    const existente = producto.id ? this.db.productos().find((p) => p.id === producto.id && p.kioscoId === KIOSCO_ACTUAL_ID) : undefined;
    if (producto.id && !existente) return throwError(() => new Error('No encontramos el producto.'));
    const guardado: Producto = existente
      ? { ...existente, nombre, precio: producto.precio, disponible: producto.disponible }
      : { id: `${KIOSCO_ACTUAL_ID}-n${Date.now()}`, kioscoId: KIOSCO_ACTUAL_ID, nombre, precio: producto.precio, disponible: producto.disponible };
    this.db.productos.update((ps) => (existente ? ps.map((p) => (p.id === guardado.id ? guardado : p)) : [...ps, guardado]));
    return of(guardado).pipe(delay(this.latencia));
  }
}

