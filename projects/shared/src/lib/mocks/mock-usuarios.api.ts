import { Injectable, computed, inject } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { Observable, delay, distinctUntilChanged, map, of, throwError } from 'rxjs';
import { ResultadoCrearPedido, UsuariosApi } from '../api/usuarios.api';
import { Kiosco, Producto } from '../models/kiosco';
import { Pedido, cantidadProductos, totalPedido } from '../models/pedido';
import { DireccionEntrega, KioscoReciente, NuevoPedido, RiderPublico, Usuario } from '../models/usuario';
import { ZonaId } from '../models/zona';
import { ESTADOS_ABIERTOS, PEDIDO_MINIMO, calcularComision, costoEnvio, distanciaKm, envioCliente, generarPin, puedeRecibirPedidos } from '../rules/pedido.rules';
import { servicioAbierto } from '../rules/horario.rules';
import { FREEDELI_CONFIG, HORARIO_LIBRE } from '../config/freedeli.config';
import { MockDb, USUARIO_ACTUAL_ID } from './mock-db';
import { Resultado, aceptarAjuste, cancelarPorCliente } from '../rules/flujo.rules';
import { LATENCIA_MOCK } from './mock-riders.api';

@Injectable()
export class MockUsuariosApi extends UsuariosApi {
  private readonly db = inject(MockDb);
  private readonly latencia = inject(LATENCIA_MOCK);
  private readonly config = inject(FREEDELI_CONFIG);
  private readonly horarioLibre = inject(HORARIO_LIBRE);
  private readonly pedidos$ = toObservable(this.db.pedidos);

  private readonly abierto = computed(
    () => this.db.pedidos().find((p) => p.usuarioId === USUARIO_ACTUAL_ID && ESTADOS_ABIERTOS.includes(p.estado)) ?? null,
  );

  private transicion(pedidoId: string, paso: (p: Pedido) => Resultado): Observable<Pedido> {
    const p = this.db.buscarPedido(pedidoId);
    if (!p || p.usuarioId !== USUARIO_ACTUAL_ID) return throwError(() => new Error('No encontramos el pedido.'));
    const r = paso(p);
    if (!r.ok) return throwError(() => new Error(r.error));
    this.db.guardarPedido(r.pedido);
    return this.responder(r.pedido);
  }

  aceptarAjuste(pedidoId: string): Observable<Pedido> {
    return this.transicion(pedidoId, aceptarAjuste);
  }

  cancelarPedido(pedidoId: string): Observable<Pedido> {
    return this.transicion(pedidoId, cancelarPorCliente);
  }

  private usuario(): Usuario {
    return this.db.usuarios().find((u) => u.id === USUARIO_ACTUAL_ID)!;
  }

  private responder<T>(valor: T): Observable<T> {
    return of(valor).pipe(delay(this.latencia));
  }

  perfil(): Observable<Usuario> {
    return this.responder(this.usuario());
  }

  cambiarDireccion(direccion: DireccionEntrega): Observable<Usuario> {
    const ubicacion = this.db.geolocalizar(direccion.direccion, direccion.zona);
    this.db.usuarios.update((us) => us.map((u) => (u.id === USUARIO_ACTUAL_ID ? { ...u, direccion: { ...direccion, ubicacion } } : u)));
    return this.responder(this.usuario());
  }

  /** Costo real del viaje desde el kiosco hasta la dirección del usuario. */
  private viaje(k: Kiosco): { km: number; costo: number } {
    const u = this.usuario();
    const destino = u.direccion.ubicacion ?? this.db.geolocalizar(u.direccion.direccion, u.direccion.zona);
    const km = distanciaKm(k.ubicacion, destino);
    return { km, costo: costoEnvio(km, this.config.tarifaEnvio) };
  }

  /** El kiosco con distancia y la parte del envío que paga el usuario. */
  private paraUsuario(k: Kiosco): Kiosco {
    const { km, costo } = this.viaje(k);
    return { ...k, distanciaKm: km, costoEnvio: envioCliente(costo) };
  }

  kioscosAbiertos(zona?: ZonaId): Observable<Kiosco[]> {
    return this.responder(
      this.db
        .kioscos()
        .filter((k) => puedeRecibirPedidos(k) && (!zona || k.zona === zona))
        .map((k) => this.paraUsuario(k)),
    );
  }

  kiosco(id: string): Observable<Kiosco | null> {
    const k = this.db.kioscos().find((x) => x.id === id);
    return this.responder(k ? this.paraUsuario(k) : null);
  }

  productos(kioscoId: string): Observable<Producto[]> {
    return this.responder(this.db.productos().filter((p) => p.kioscoId === kioscoId && p.disponible));
  }

  crearPedido(nuevo: NuevoPedido): Observable<ResultadoCrearPedido> {
    const encontrado = this.db.kioscos().find((k) => k.id === nuevo.kioscoId);
    const kiosco = encontrado ? this.paraUsuario(encontrado) : undefined;
    const catalogo = this.db.productos().filter((p) => p.kioscoId === nuevo.kioscoId && p.disponible);
    const lineas = nuevo.items.filter((i) => Number.isInteger(i.cantidad) && i.cantidad > 0);

    let resultado: ResultadoCrearPedido;
    const subtotal = lineas.reduce((a, i) => a + i.cantidad * (catalogo.find((p) => p.id === i.productoId)?.precio ?? 0), 0);
    if (!this.horarioLibre && !servicioAbierto(new Date())) {
      resultado = { ok: false, motivo: 'fuera-de-horario' };
    } else if (!kiosco || !puedeRecibirPedidos(kiosco)) {
      resultado = { ok: false, motivo: 'kiosco-cerrado' };
    } else if (lineas.length === 0) {
      resultado = { ok: false, motivo: 'sin-productos' };
    } else if (lineas.some((i) => !catalogo.some((p) => p.id === i.productoId))) {
      resultado = { ok: false, motivo: 'producto-inexistente' };
    } else if (subtotal < PEDIDO_MINIMO) {
      resultado = { ok: false, motivo: 'pedido-minimo' };
    } else if (this.abierto()) {
      resultado = { ok: false, motivo: 'pedido-en-curso' };
    } else {
      const u = this.usuario();
      const numero = Math.max(999, ...this.db.pedidos().map((p) => p.numero)) + 1;
      const pedido: Pedido = {
        id: `ped-${numero}`,
        numero,
        zona: kiosco.zona,
        kioscoId: kiosco.id,
        kioscoNombre: kiosco.nombre,
        kioscoDireccion: kiosco.direccion,
        usuarioId: u.id,
        destino: { nombre: u.nombreCorto, direccion: u.direccion.direccion, notas: u.direccion.notas },
        items: lineas.map((i) => {
          const prod = catalogo.find((p) => p.id === i.productoId)!;
          return { productoId: prod.id, nombre: prod.nombre, cantidad: i.cantidad, precioUnitario: prod.precio };
        }),
        costoEnvio: kiosco.costoEnvio,
        distanciaKm: kiosco.distanciaKm ?? 0,
        propina: 0,
        // El rider cobra el viaje completo; lo que supera el tope lo pone el kiosco.
        gananciaRider: this.viaje(encontrado!).costo,
        // El cliente transfiere al alias del kiosco; queda pendiente hasta que el kiosco lo confirme.
        pago: 'pendiente',
        aliasKiosco: kiosco.aliasCobro,
        comisionFreeDeli: calcularComision(subtotal, this.config.comisionPorcentaje),
        pin: generarPin(),
        estado: 'esperando',
        fase: 'stock',
        creadoEn: new Date(),
      };
      this.db.pedidos.update((ps) => [...ps, pedido]);
      resultado = { ok: true, pedido };
    }
    return this.responder(resultado);
  }

  pedidoEnCurso(): Observable<Pedido | null> {
    return this.pedidos$.pipe(
      map((ps) => ps.find((p) => p.usuarioId === USUARIO_ACTUAL_ID && ESTADOS_ABIERTOS.includes(p.estado)) ?? null),
      distinctUntilChanged(),
    );
  }

  pedido(id: string): Observable<Pedido | null> {
    return this.pedidos$.pipe(
      map((ps) => ps.find((p) => p.id === id && p.usuarioId === USUARIO_ACTUAL_ID) ?? null),
      distinctUntilChanged(),
    );
  }

  recientes(limite = 3): Observable<KioscoReciente[]> {
    const entregados = this.db
      .pedidos()
      .filter((p) => p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'entregado')
      .sort((a, b) => b.creadoEn.getTime() - a.creadoEn.getTime());
    const vistos = new Set<string>();
    const lista: KioscoReciente[] = [];
    for (const p of entregados) {
      const kiosco = this.db.kioscos().find((k) => k.id === p.kioscoId);
      if (!kiosco || vistos.has(kiosco.id)) continue;
      vistos.add(kiosco.id);
      lista.push({ kiosco, pedidoId: p.id, fecha: p.creadoEn, cantidadProductos: cantidadProductos(p), total: totalPedido(p) });
      if (lista.length === limite) break;
    }
    return this.responder(lista);
  }

  riderAsignado(pedidoId: string): Observable<RiderPublico | null> {
    const p = this.db.pedidos().find((x) => x.id === pedidoId);
    const r = p?.riderId ? this.db.riders().find((x) => x.id === p.riderId) : undefined;
    if (!r) return this.responder(null);
    const [nombre, apellido] = r.nombre.split(' ');
    return this.responder({ nombre: apellido ? `${nombre} ${apellido[0]}.` : nombre, vehiculo: r.vehiculo.modelo, patente: r.vehiculo.patente });
  }
}
