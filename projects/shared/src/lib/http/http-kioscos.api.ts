import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, Subject, filter, map, merge, scan, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { KioscosApi } from '../api/kioscos.api.js';
import { DatosKiosco, GananciasKiosco, MovimientoSaldo, PeriodoAdmin } from '../models/admin.js';
import { Kiosco, Producto } from '../models/kiosco.js';
import { Pedido } from '../models/pedido.js';
import { PeriodoHistorial } from '../models/rider.js';
import { RiderPublico } from '../models/usuario.js';
import { ESTADOS_ABIERTOS } from '../rules/pedido.rules.js';
import { reintegroPendiente } from '../rules/cancelacion.rules.js';
import { API_URL } from './api-url';
import { EventosCliente } from './eventos';
import { MovimientoSaldoJson, revivirMovimiento, revivirPedido } from './revivir';


/** KioscosApi contra la API real, con el tablero y el saldo al día por eventos. */
@Injectable()
export class HttpKioscosApi extends KioscosApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly eventos = inject(EventosCliente);
  /** Avisos para volver a pedir datos que cambian por acciones propias. */
  private readonly cambioKiosco$ = new Subject<void>();
  private readonly cambioCatalogo$ = new Subject<void>();
  /** Al entregarse un pedido se descuenta la comisión: cambia el saldo. */
  private readonly entregas$ = this.eventos.pedidos$.pipe(filter((p) => p.estado === 'entregado'));

  kiosco(): Observable<Kiosco> {
    return merge(this.cambioKiosco$, this.entregas$, this.eventos.conexiones$).pipe(
      startWith(null),
      switchMap(() => this.http.get<Kiosco>(`${this.url}/kiosco`)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
  }

  /** Pedidos abiertos: los trae una vez y los mantiene al día con los eventos. */
  pedidosEnVivo(): Observable<Pedido[]> {
    return this.eventos.alConectar(() => this.http.get<Pedido[]>(`${this.url}/kiosco/pedidos/en-vivo`)).pipe(
      map((ps) => ps.map(revivirPedido)),
      switchMap((inicial) =>
        this.eventos.pedidos$.pipe(
          scan((lista: Pedido[], p: Pedido) => {
            const sin = lista.filter((x) => x.id !== p.id);
            return ESTADOS_ABIERTOS.includes(p.estado) || reintegroPendiente(p) ? [...sin, p].sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime()) : sin;
          }, inicial),
          startWith(inicial),
        ),
      ),
    );
  }

  rider(riderId: string): Observable<RiderPublico | null> {
    return this.http.get<RiderPublico>(`${this.url}/kiosco/riders/${riderId}`);
  }

  private paso(pedidoId: string, accion: string, cuerpo: object = {}): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.url}/kiosco/pedidos/${pedidoId}/${accion}`, cuerpo).pipe(map(revivirPedido));
  }

  confirmarStock(pedidoId: string, faltantes: string[]): Observable<Pedido> {
    return this.paso(pedidoId, 'stock', { faltantes });
  }

  confirmarTransferencia(pedidoId: string): Observable<Pedido> {
    return this.paso(pedidoId, 'transferencia');
  }

  aprobarRider(pedidoId: string, aprobado: boolean): Observable<Pedido> {
    return this.paso(pedidoId, 'aprobar-rider', { aprobado });
  }

  marcarReintegrado(pedidoId: string): Observable<Pedido> {
    return this.paso(pedidoId, 'reintegro');
  }

  confirmarEnvio(pedidoId: string): Observable<Pedido> {
    return this.paso(pedidoId, 'envio');
  }

  historial(periodo: PeriodoHistorial): Observable<Pedido[]> {
    return this.http.get<Pedido[]>(`${this.url}/kiosco/historial`, { params: { periodo } }).pipe(map((ps) => ps.map(revivirPedido)));
  }

  ganancias(periodo: PeriodoAdmin): Observable<GananciasKiosco> {
    return this.http.get<GananciasKiosco>(`${this.url}/kiosco/ganancias`, { params: { periodo } });
  }

  actualizarDatos(datos: DatosKiosco): Observable<Kiosco> {
    return this.http.patch<Kiosco>(`${this.url}/kiosco/datos`, datos).pipe(tap(() => this.cambioKiosco$.next()));
  }

  movimientosSaldo(): Observable<MovimientoSaldo[]> {
    return merge(this.entregas$, this.eventos.conexiones$).pipe(
      startWith(null),
      switchMap(() => this.http.get<MovimientoSaldoJson[]>(`${this.url}/kiosco/saldo`)),
      map((ms) => ms.map(revivirMovimiento)),
    );
  }

  catalogo(): Observable<Producto[]> {
    return this.cambioCatalogo$.pipe(
      startWith(null),
      switchMap(() => this.http.get<Producto[]>(`${this.url}/kiosco/productos`)),
    );
  }

  guardarProducto(producto: Omit<Producto, 'id' | 'kioscoId'> & { id?: string }): Observable<Producto> {
    const { id, ...datos } = producto;
    const llamada = id ? this.http.patch<Producto>(`${this.url}/kiosco/productos/${id}`, datos) : this.http.post<Producto>(`${this.url}/kiosco/productos`, datos);
    return llamada.pipe(tap(() => this.cambioCatalogo$.next()));
  }
}

