import { Injectable, signal } from '@angular/core';
import { Kiosco, Producto } from '../models/kiosco';
import { OfertaPedido, Pedido } from '../models/pedido';
import { Rider } from '../models/rider';
import { Usuario } from '../models/usuario';
import { Conflicto, MovimientoSaldo } from '../models/admin';
import { codigoPedido } from '../models/pedido';
import { DemandaZona, Ubicacion, ZONAS, ZonaId } from '../models/zona';
import { PEDIDO_MINIMO, calcularComision, costoEnvio, envioCliente, generarPin, puedeRecibirPedidos } from '../rules/pedido.rules';
import { TARIFA_ENVIO_PROVISORIA } from '../config/freedeli.config';
import { geolocalizarProvisorio } from '../rules/cobertura.rules';

/** Generador pseudoaleatorio con semilla, para que los datos simulados sean siempre los mismos. */
function crearRandom(semilla: number): () => number {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const RIDER_ACTUAL_ID = 'r1';
/** Otro rider, que toma los pedidos que el rider actual no toma. */
export const OTRO_RIDER_ID = 'r2';
export const USUARIO_ACTUAL_ID = 'u1';
/** El kiosco con sesión iniciada en la app de Kioscos. */
export const KIOSCO_ACTUAL_ID = 'k1';

const KIOSCOS: Kiosco[] = [
  { id: 'k1', nombre: 'Kiosco El Faro', zona: 'san-miguel', direccion: 'Av. Pres. Perón 1420', ubicacion: { lat: -34.5415, lng: -58.7025 }, abierto: true, pausado: false, saldo: 48000, tiempoEstimadoMin: 25, costoEnvio: 0, aliasCobro: 'elfaro.kiosco' },
  { id: 'k2', nombre: 'Maxikiosco 24', zona: 'san-miguel', direccion: 'Belgrano 980', ubicacion: { lat: -34.545, lng: -58.697 }, abierto: true, pausado: false, saldo: 12500, tiempoEstimadoMin: 20, costoEnvio: 0, aliasCobro: 'maxi24.sm' },
  { id: 'k3', nombre: 'Kiosco La Estación', zona: 'muniz', direccion: 'Av. Ricchieri 455', ubicacion: { lat: -34.55, lng: -58.703 }, abierto: true, pausado: false, saldo: 30200, tiempoEstimadoMin: 30, costoEnvio: 0, aliasCobro: 'laestacion.muniz' },
  { id: 'k4', nombre: 'Drugstore Bella', zona: 'bella-vista', direccion: 'Senador Morón 1210', ubicacion: { lat: -34.561, lng: -58.688 }, abierto: true, pausado: false, saldo: 61000, tiempoEstimadoMin: 35, costoEnvio: 0, aliasCobro: 'drugstore.bella' },
  { id: 'k5', nombre: 'Kiosco Pixel', zona: 'bella-vista', direccion: 'Av. Gaspar Campos 3300', ubicacion: { lat: -34.566, lng: -58.698 }, abierto: false, pausado: false, saldo: 5000, tiempoEstimadoMin: 30, costoEnvio: 0, aliasCobro: 'kiosco.pixel' },
];

const PRODUCTOS = [
  { id: 'p1', nombre: 'Coca-Cola 1,5 L', precio: 2800 },
  { id: 'p2', nombre: 'Alfajor triple', precio: 1200 },
  { id: 'p3', nombre: 'Papas fritas 150 g', precio: 2100 },
  { id: 'p4', nombre: 'Agua mineral 500 ml', precio: 900 },
  { id: 'p5', nombre: 'Cerveza lata 473 ml', precio: 1900 },
  { id: 'p6', nombre: 'Chicles menta', precio: 600 },
  { id: 'p7', nombre: 'Hielo 2 kg', precio: 1500 },
  { id: 'p8', nombre: 'Galletitas rellenas', precio: 1600 },
];

/** Catálogo: cada kiosco abierto vende todos los productos. */
const CATALOGO: Producto[] = KIOSCOS.flatMap((k) => PRODUCTOS.map((p) => ({ ...p, id: `${k.id}-${p.id}`, kioscoId: k.id, disponible: true })));

const NOMBRES = ['Martina R.', 'Joaquín P.', 'Sofía G.', 'Tomás L.', 'Valentina M.', 'Nicolás F.'];

const CALLES = ['Paunero', 'Sarmiento', 'Italia', 'Mitre', 'Conesa', 'Pardo', 'Muñoz', 'Tribulato'];

/**
 * Base de datos en memoria. Las implementaciones mock de las APIs leen y escriben acá.
 * Se reemplaza por el backend real sin tocar las pantallas.
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  readonly kioscos = signal<Kiosco[]>(KIOSCOS);
  readonly productos = signal<Producto[]>(CATALOGO);
  readonly usuarios = signal<Usuario[]>([
    {
      id: USUARIO_ACTUAL_ID,
      nombre: 'Martina',
      nombreCorto: 'Martina R.',
      telefono: '+54 9 11 5555-0199',
      email: 'martina@example.com',
      direccion: { direccion: 'Belgrano 845', notas: 'Depto 2B, tocar timbre', zona: 'san-miguel', ubicacion: { lat: -34.543, lng: -58.701 } },
    },
  ]);
  readonly riders = signal<Rider[]>([
    {
      id: RIDER_ACTUAL_ID,
      nombre: 'Lucas Romero',
      telefono: '+54 9 11 5555-0142',
      email: 'lucas.romero@example.com',
      dni: '38.456.123',
      vehiculo: { modelo: 'Honda Wave 110', patente: 'A123BCD' },
      cobro: { aliasCbu: 'lucas.rider.fd' },
      preferencias: { notificaciones: true, sonidos8bit: true },
      disponible: false,
      zonas: ['san-miguel'],
      pausado: false,
      riderDesde: new Date(2026, 2, 3),
    },
    {
      id: OTRO_RIDER_ID,
      nombre: 'Agustina Paz',
      telefono: '+54 9 11 5555-0177',
      email: 'agustina.paz@example.com',
      dni: '40.112.334',
      vehiculo: { modelo: 'Motomel Blitz 110', patente: 'A456KLM' },
      cobro: { aliasCbu: 'agus.paz.fd' },
      preferencias: { notificaciones: true, sonidos8bit: false },
      disponible: true,
      zonas: ['san-miguel', 'muniz', 'bella-vista'],
      pausado: false,
      riderDesde: new Date(2025, 10, 12),
    },
  ]);
  readonly pedidos = signal<Pedido[]>([]);
  /** Riders activos de otras personas, por zona (simulado). */
  readonly otrosRidersActivos = signal<Record<ZonaId, number>>({ 'san-miguel': 4, muniz: 1, 'bella-vista': 2 });
  /** Horas online del rider actual por período (simulado). */
  readonly horasOnline = { jornada: 3.5, semana: 26, 'mes-pasado': 112 } as const;

  /**
   * Geolocalización simulada: el centro de la zona más un corrimiento fijo según el texto.
   * El backend real usará un servicio de mapas.
   */
  geolocalizar(direccion: string, zona: ZonaId): Ubicacion {
    return geolocalizarProvisorio(direccion, zona);
  }

  readonly movimientosSaldo = signal<MovimientoSaldo[]>([]);

  /** Suma o resta al saldo prepago y lo registra. */
  moverSaldo(kioscoId: string, tipo: MovimientoSaldo['tipo'], monto: number, referencia: string): void {
    const k = this.kioscos().find((x) => x.id === kioscoId);
    if (!k) return;
    const saldoResultante = k.saldo + monto;
    this.kioscos.update((ks) => ks.map((x) => (x.id === kioscoId ? { ...x, saldo: saldoResultante } : x)));
    this.movimientosSaldo.update((ms) => [
      ...ms,
      { id: `ms-${ms.length + 1}`, kioscoId, fecha: new Date(), tipo, monto, referencia, saldoResultante },
    ]);
  }

  buscarPedido(id: string): Pedido | undefined {
    return this.pedidos().find((p) => p.id === id);
  }

  guardarPedido(pedido: Pedido): void {
    this.pedidos.update((ps) => ps.map((p) => (p.id === pedido.id ? pedido : p)));
  }

  siguienteNumero(): number {
    return Math.max(999, ...this.pedidos().map((p) => p.numero)) + 1;
  }

  /** Pedido nuevo de un cliente simulado en un kiosco, recién llegado (fase stock). */
  crearPedidoDeCliente(kioscoId: string, ahora = new Date()): Pedido | null {
    const kiosco = this.kioscos().find((k) => k.id === kioscoId);
    if (!kiosco || !puedeRecibirPedidos(kiosco)) return null;
    const numero = this.siguienteNumero();
    const pedido: Pedido = {
      ...this.armarPedido(Math.random, [kiosco], ahora, undefined, 'esperando'),
      numero,
      id: `ped-${numero}`,
      fase: 'stock',
      pago: 'pendiente',
    };
    this.pedidos.update((ps) => [...ps, pedido]);
    return pedido;
  }

  /** Al liberarse el pago, la comisión se descuenta del saldo prepago del kiosco. */
  descontarComision(pedido: Pedido): void {
    this.moverSaldo(pedido.kioscoId, 'comision', -pedido.comisionFreeDeli, codigoPedido(pedido));
  }

  /** Conflictos registrados desde FreeDeli Dev. */
  readonly conflictos = signal<Conflicto[]>([]);

  /** Oferta vigente por rider. */
  readonly ofertas = signal<Record<string, OfertaPedido>>({});

  constructor() {
    this.pedidos.set(this.generarPedidos(new Date()));
  }

  demanda(ahora = new Date()): DemandaZona[] {
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const rider = this.riders().find((r) => r.id === RIDER_ACTUAL_ID)!;
    return ZONAS.map(({ id }) => ({
      zona: id,
      pedidosJornada: this.pedidos().filter((p) => p.zona === id && p.creadoEn >= hoy).length,
      ridersActivos:
        this.otrosRidersActivos()[id] + (rider.disponible && rider.zonas.includes(id) ? 1 : 0),
    }));
  }

  /**
   * Crea un pedido nuevo, esperando rider, en un kiosco abierto de alguna de las zonas.
   * Devuelve null si no hay kioscos abiertos en esas zonas.
   */
  crearPedidoEsperando(zonas: readonly ZonaId[], ahora = new Date()): Pedido | null {
    const kioscos = this.kioscos().filter((k) => puedeRecibirPedidos(k) && zonas.includes(k.zona));
    if (kioscos.length === 0) return null;
    const numero = this.siguienteNumero();
    // Ya pasó por el kiosco: stock confirmado y transferencia recibida. Se ofrece a riders.
    const pedido: Pedido = {
      ...this.armarPedido(Math.random, kioscos, ahora, undefined, 'esperando'),
      numero,
      id: `ped-${numero}`,
      fase: 'rider',
      pago: 'transferido',
    };
    this.pedidos.update((ps) => [...ps, pedido]);
    return pedido;
  }

  private armarPedido(
    random: () => number,
    kioscos: readonly Kiosco[],
    creadoEn: Date,
    riderId: string | undefined,
    estado: Pedido['estado'],
  ): Pedido {
    const pick = <T>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)];
    const kiosco = pick(kioscos);
    // Entrega a entre 0,5 y 4 km del kiosco.
    const km = Math.round((0.5 + random() * 3.5) * 10) / 10;
    // Productos al azar hasta superar el pedido mínimo.
    const items: Pedido['items'] = [];
    let subtotal = 0;
    while (subtotal < PEDIDO_MINIMO) {
      const prod = pick(PRODUCTOS);
      const cantidad = 1 + Math.floor(random() * 3);
      const existente = items.find((i) => i.productoId === `${kiosco.id}-${prod.id}`);
      if (existente) existente.cantidad += cantidad;
      else items.push({ productoId: `${kiosco.id}-${prod.id}`, nombre: prod.nombre, cantidad, precioUnitario: prod.precio });
      subtotal += cantidad * prod.precio;
    }
    return {
      id: '',
      numero: 0,
      zona: kiosco.zona,
      kioscoId: kiosco.id,
      kioscoNombre: kiosco.nombre,
      kioscoDireccion: kiosco.direccion,
      usuarioId: `u${1 + Math.floor(random() * 4)}`,
      destino: {
        nombre: pick(NOMBRES),
        direccion: `${pick(CALLES)} ${100 + Math.floor(random() * 2900)}`,
        notas: random() < 0.4 ? 'Timbre 2B, dejar en portería' : undefined,
      },
      items,
      costoEnvio: envioCliente(costoEnvio(km, TARIFA_ENVIO_PROVISORIA)),
      distanciaKm: km,
      propina: random() < 0.35 ? pick([300, 500, 1000]) : 0,
      gananciaRider: costoEnvio(km, TARIFA_ENVIO_PROVISORIA),
      pago: estado === 'entregado' ? 'liberado' : 'transferido',
      aliasKiosco: kiosco.aliasCobro,
      comisionFreeDeli: calcularComision(subtotal, 10),
      pin: generarPin(random),
      estado,
      riderId,
      creadoEn,
      aceptadoEn: riderId ? new Date(creadoEn.getTime() + 2 * 60_000) : undefined,
      entregadoEn: estado === 'entregado' ? new Date(creadoEn.getTime() + (20 + Math.floor(random() * 20)) * 60_000) : undefined,
    };
  }

  private generarPedidos(ahora: Date): Pedido[] {
    const random = crearRandom(42);
    const pedidos: Pedido[] = [];
    const abiertos = KIOSCOS.filter((k) => k.abierto);

    const nuevo = (creadoEn: Date, riderId: string | undefined, estado: Pedido['estado']) =>
      this.armarPedido(random, abiertos, creadoEn, riderId, estado);

    // Historial del rider actual: unos 45 días hacia atrás, sin superar "ahora".
    for (let dia = 45; dia >= 0; dia--) {
      const cantidad = dia === 0 ? 5 : Math.floor(random() * 9);
      for (let i = 0; i < cantidad; i++) {
        const creadoEn =
          dia === 0
            ? // Hoy: entre 1 y 10 horas antes de ahora, sin pasar a ayer.
              new Date(Math.max(ahora.getTime() - (1 + random() * 9) * 3_600_000, new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime()))
            : new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - dia, 10 + Math.floor(random() * 14), Math.floor(random() * 60));
        pedidos.push(nuevo(creadoEn, RIDER_ACTUAL_ID, random() < 0.08 ? 'cancelado' : 'entregado'));
      }
    }

    // Pedidos de hoy de otros riders, para la demanda por zona.
    for (let i = 0; i < 14; i++) {
      const creadoEn = new Date(ahora.getTime() - Math.floor(random() * 6 * 60) * 60_000);
      pedidos.push(nuevo(creadoEn, OTRO_RIDER_ID, 'entregado'));
    }

    // Pedido en curso: lo lleva el rider actual y es del usuario actual.
    const enCurso = nuevo(new Date(ahora.getTime() - 12 * 60_000), RIDER_ACTUAL_ID, 'retirado');
    enCurso.retiro = { kiosco: new Date(ahora.getTime() - 6 * 60_000), rider: new Date(ahora.getTime() - 6 * 60_000) };
    pedidos.push({
      ...enCurso,
      usuarioId: USUARIO_ACTUAL_ID,
      destino: { nombre: 'Martina R.', direccion: 'Belgrano 845', notas: 'Depto 2B, tocar timbre' },
    });

    // Numerar por orden de creación, como lo haría el backend.
    return pedidos
      .sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime())
      .map((p, i) => ({ ...p, numero: 1000 + i, id: `ped-${1000 + i}` }));
  }
}
