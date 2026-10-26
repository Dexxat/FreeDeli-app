import { Injectable, signal } from '@angular/core';
import { Kiosco } from '../models/kiosco';
import { Pedido } from '../models/pedido';
import { Rider } from '../models/rider';
import { DemandaZona, ZONAS, ZonaId } from '../models/zona';
import { generarPin } from '../rules/pedido.rules';

/** Generador pseudoaleatorio con semilla, para que los datos simulados sean siempre los mismos. */
function crearRandom(semilla: number): () => number {
  let s = semilla;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

export const RIDER_ACTUAL_ID = 'r1';

const KIOSCOS: Kiosco[] = [
  { id: 'k1', nombre: 'Kiosco El Faro', zona: 'san-miguel', direccion: 'Av. Pres. Perón 1420', abierto: true, pausado: false, saldo: 48000, tiempoEstimadoMin: 25, costoEnvio: 1500 },
  { id: 'k2', nombre: 'Maxikiosco 24', zona: 'san-miguel', direccion: 'Belgrano 980', abierto: true, pausado: false, saldo: 12500, tiempoEstimadoMin: 20, costoEnvio: 1200 },
  { id: 'k3', nombre: 'Kiosco La Estación', zona: 'muniz', direccion: 'Av. Ricchieri 455', abierto: true, pausado: false, saldo: 30200, tiempoEstimadoMin: 30, costoEnvio: 1800 },
  { id: 'k4', nombre: 'Drugstore Bella', zona: 'bella-vista', direccion: 'Senador Morón 1210', abierto: true, pausado: false, saldo: 61000, tiempoEstimadoMin: 35, costoEnvio: 2000 },
  { id: 'k5', nombre: 'Kiosco Pixel', zona: 'bella-vista', direccion: 'Av. Gaspar Campos 3300', abierto: false, pausado: false, saldo: 5000, tiempoEstimadoMin: 30, costoEnvio: 1700 },
];

const PRODUCTOS = [
  { id: 'p1', nombre: 'Coca-Cola 1,5 L', precio: 2800 },
  { id: 'p2', nombre: 'Alfajor triple', precio: 1200 },
  { id: 'p3', nombre: 'Papas fritas 150 g', precio: 2100 },
  { id: 'p4', nombre: 'Agua mineral 500 ml', precio: 900 },
  { id: 'p5', nombre: 'Cerveza lata 473 ml', precio: 1900 },
  { id: 'p6', nombre: 'Chicles menta', precio: 600 },
];

const CALLES = ['Paunero', 'Sarmiento', 'Italia', 'Mitre', 'Conesa', 'Pardo', 'Muñoz', 'Tribulato'];

/**
 * Base de datos en memoria. Las implementaciones mock de las APIs leen y escriben acá.
 * Se reemplaza por el backend real sin tocar las pantallas.
 */
@Injectable({ providedIn: 'root' })
export class MockDb {
  readonly kioscos = signal<Kiosco[]>(KIOSCOS);
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
    },
  ]);
  readonly pedidos = signal<Pedido[]>([]);
  /** Riders activos de otras personas, por zona (simulado). */
  readonly otrosRidersActivos = signal<Record<ZonaId, number>>({ 'san-miguel': 4, muniz: 1, 'bella-vista': 2 });
  /** Horas online del rider actual por período (simulado). */
  readonly horasOnline = { jornada: 3.5, semana: 26, 'mes-pasado': 112 } as const;

  private siguienteNumero = 1000;

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

  private generarPedidos(ahora: Date): Pedido[] {
    const random = crearRandom(42);
    const pick = <T>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)];
    const pedidos: Pedido[] = [];
    const abiertos = KIOSCOS.filter((k) => k.abierto);

    const nuevo = (creadoEn: Date, riderId: string | undefined, estado: Pedido['estado']): Pedido => {
      const kiosco = pick(abiertos);
      const items = Array.from({ length: 1 + Math.floor(random() * 3) }, () => {
        const prod = pick(PRODUCTOS);
        return { productoId: prod.id, nombre: prod.nombre, cantidad: 1 + Math.floor(random() * 2), precioUnitario: prod.precio };
      });
      const aceptadoEn = riderId ? new Date(creadoEn.getTime() + 2 * 60_000) : undefined;
      return {
        id: `ped-${this.siguienteNumero}`,
        numero: this.siguienteNumero++,
        zona: kiosco.zona,
        kioscoId: kiosco.id,
        kioscoNombre: kiosco.nombre,
        kioscoDireccion: kiosco.direccion,
        usuarioId: 'u1',
        destino: {
          direccion: `${pick(CALLES)} ${100 + Math.floor(random() * 2900)}`,
          notas: random() < 0.4 ? 'Timbre 2B, dejar en portería' : undefined,
        },
        items,
        costoEnvio: kiosco.costoEnvio,
        propina: random() < 0.35 ? pick([300, 500, 1000]) : 0,
        gananciaRider: Math.round(kiosco.costoEnvio * 0.8),
        cobro: random() < 0.7 ? 'pagado' : 'cobrar-en-destino',
        pin: generarPin(random),
        estado,
        riderId,
        creadoEn,
        aceptadoEn,
        entregadoEn: estado === 'entregado' ? new Date(creadoEn.getTime() + (20 + Math.floor(random() * 20)) * 60_000) : undefined,
      };
    };

    // Historial del rider actual: unos 45 días hacia atrás, sin superar "ahora".
    for (let dia = 45; dia >= 0; dia--) {
      const cantidad = dia === 0 ? 5 : Math.floor(random() * 9);
      for (let i = 0; i < cantidad; i++) {
        const creadoEn = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() - dia, 10 + Math.floor(random() * 14), Math.floor(random() * 60));
        if (creadoEn.getTime() > ahora.getTime() - 60 * 60_000) continue;
        pedidos.push(nuevo(creadoEn, RIDER_ACTUAL_ID, random() < 0.08 ? 'cancelado' : 'entregado'));
      }
    }

    // Pedidos de hoy de otros riders, para la demanda por zona.
    for (let i = 0; i < 14; i++) {
      const creadoEn = new Date(ahora.getTime() - Math.floor(random() * 6 * 60) * 60_000);
      pedidos.push(nuevo(creadoEn, 'otro', 'entregado'));
    }

    // Pedido en curso del rider actual.
    pedidos.push(nuevo(new Date(ahora.getTime() - 12 * 60_000), RIDER_ACTUAL_ID, 'retirado'));

    return pedidos.sort((a, b) => a.creadoEn.getTime() - b.creadoEn.getTime());
  }
}
