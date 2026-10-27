import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, distinctUntilChanged, filter, map, merge, of, scan, startWith, switchMap } from 'rxjs';
import { ResultadoCrearPedido, UsuariosApi } from '../api/usuarios.api.js';
import { Kiosco, Producto } from '../models/kiosco.js';
import { Pedido, cantidadProductos, totalPedido } from '../models/pedido.js';
import { DatosPersonales, DireccionEntrega, KioscoReciente, NuevoPedido, RiderPublico, Usuario } from '../models/usuario.js';
import { ZonaId } from '../models/zona.js';
import { ESTADOS_ABIERTOS } from '../rules/pedido.rules.js';
import { API_URL } from './api-url';
import { EventosCliente } from './eventos';
import { revivirPedido } from './revivir';
import { EstrellaSumada } from '../rules/premios.rules.js';

type MotivoCrear = Extract<ResultadoCrearPedido, { ok: false }>['motivo'];
const MOTIVOS: readonly MotivoCrear[] = ['kiosco-cerrado', 'sin-productos', 'producto-inexistente', 'pedido-minimo', 'pedido-en-curso', 'fuera-de-horario', 'fuera-de-cobertura'];

/** UsuariosApi contra la API real, con actualizaciones en tiempo real. */
@Injectable()
export class HttpUsuariosApi extends UsuariosApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly eventos = inject(EventosCliente);

  perfil(): Observable<Usuario> {
    return this.http.get<Usuario>(`${this.url}/usuario/perfil`);
  }

  cambiarDireccion(d: DireccionEntrega): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.url}/usuario/direccion`, { direccion: d.direccion, notas: d.notas, zona: d.zona });
  }

  actualizarDatos(datos: DatosPersonales): Observable<Usuario> {
    return this.http.patch<Usuario>(`${this.url}/usuario/datos`, datos);
  }

  kioscosAbiertos(zona?: ZonaId): Observable<Kiosco[]> {
    return this.http.get<Kiosco[]>(`${this.url}/kioscos`, { params: zona ? { zona } : {} });
  }

  kiosco(id: string): Observable<Kiosco | null> {
    return this.http.get<Kiosco>(`${this.url}/kioscos/${id}`).pipe(catchError(() => of(null)));
  }

  productos(kioscoId: string): Observable<Producto[]> {
    return this.http.get<Producto[]>(`${this.url}/kioscos/${kioscoId}/productos`);
  }

  crearPedido(nuevo: NuevoPedido): Observable<ResultadoCrearPedido> {
    return this.http.post<Pedido>(`${this.url}/pedidos`, nuevo).pipe(
      map((p): ResultadoCrearPedido => ({ ok: true, pedido: revivirPedido(p) })),
      catchError((e: HttpErrorResponse) => {
        const codigo = e.error?.codigo as MotivoCrear | undefined;
        if (codigo && MOTIVOS.includes(codigo)) return of<ResultadoCrearPedido>({ ok: false, motivo: codigo });
        throw e;
      }),
    );
  }

  /** El pedido abierto: lo trae una vez y lo mantiene al día con los eventos. */
  pedidoEnCurso(): Observable<Pedido | null> {
    return this.eventos.alConectar(() => this.http.get<Pedido | null>(`${this.url}/pedidos/en-curso`)).pipe(
      map((p) => (p ? revivirPedido(p) : null)),
      switchMap((inicial) =>
        this.eventos.pedidos$.pipe(
          // Un pedido abierto pasa a ser el actual; si el actual se cierra, no queda ninguno.
          scan((actual: Pedido | null, p: Pedido) => (ESTADOS_ABIERTOS.includes(p.estado) ? p : actual?.id === p.id ? null : actual), inicial),
          startWith(inicial),
        ),
      ),
      distinctUntilChanged(),
    );
  }

  pedido(id: string): Observable<Pedido | null> {
    return this.eventos.alConectar(() => this.http.get<Pedido>(`${this.url}/pedidos/${id}`)).pipe(
      map(revivirPedido),
      catchError(() => of(null)),
      switchMap((inicial) => merge(of(inicial), this.eventos.pedidos$.pipe(filter((p) => p.id === id)))),
      distinctUntilChanged(),
    );
  }

  recientes(limite = 3): Observable<KioscoReciente[]> {
    return this.http.get<Pedido[]>(`${this.url}/pedidos/recientes`).pipe(
      map((ps) =>
        ps.slice(0, limite).map((json) => {
          const p = revivirPedido(json);
          return {
            kiosco: { id: p.kioscoId, nombre: p.kioscoNombre, direccion: p.kioscoDireccion, zona: p.zona } as Kiosco,
            pedidoId: p.id,
            fecha: p.creadoEn,
            cantidadProductos: cantidadProductos(p),
            total: totalPedido(p),
          };
        }),
      ),
    );
  }

  riderAsignado(pedidoId: string): Observable<RiderPublico | null> {
    return this.http.get<RiderPublico | null>(`${this.url}/pedidos/${pedidoId}/rider`).pipe(catchError(() => of(null)));
  }

  aceptarAjuste(pedidoId: string): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.url}/pedidos/${pedidoId}/aceptar-ajuste`, {}).pipe(map(revivirPedido));
  }

  cancelarPedido(pedidoId: string): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.url}/pedidos/${pedidoId}/cancelar`, {}).pipe(map(revivirPedido));
  }

  sumarEstrella(pedidoId: string): Observable<EstrellaSumada> {
    return this.http.post<EstrellaSumada>(`${this.url}/pedidos/${pedidoId}/estrella`, {});
  }
}
