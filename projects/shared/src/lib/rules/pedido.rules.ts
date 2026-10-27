import { Kiosco } from '../models/kiosco.js';
import { Ubicacion } from '../models/zona.js';
import { EstadoPedido, OfertaPedido, PASOS_ESTADO, PasoEstado, Pedido, cantidadProductos } from '../models/pedido.js';

/** Genera un PIN de entrega de 4 dígitos (0000–9999). */
export function generarPin(random: () => number = Math.random): string {
  return Math.floor(random() * 10000)
    .toString()
    .padStart(4, '0');
}

export function pinValido(pin: string): boolean {
  return /^\d{4}$/.test(pin);
}

const SIGUIENTE: Partial<Record<EstadoPedido, EstadoPedido>> = {
  esperando: 'aceptado',
  aceptado: 'retirado',
  retirado: 'en-camino',
};

/**
 * El siguiente estado que puede marcar el rider.
 * `en-camino` → `entregado` no está acá: solo se llega con el PIN correcto.
 */
export function siguienteEstado(estado: EstadoPedido): EstadoPedido | null {
  return SIGUIENTE[estado] ?? null;
}

export type EstadoPaso = 'completado' | 'actual' | 'pendiente';

/**
 * Cómo se pinta cada paso de la barra: celeste = completado, amarillo = actual, oscuro = pendiente.
 * `entregado` se muestra con todos los pasos completados.
 */
export function estadosDeBarra(estado: EstadoPedido): Record<PasoEstado, EstadoPaso> {
  const indiceActual = PASOS_ESTADO.findIndex((p) => p.id === estado);
  const resultado = {} as Record<PasoEstado, EstadoPaso>;
  PASOS_ESTADO.forEach((paso, i) => {
    if (estado === 'entregado' || (indiceActual >= 0 && i < indiceActual)) {
      resultado[paso.id] = 'completado';
    } else if (i === indiceActual) {
      resultado[paso.id] = 'actual';
    } else {
      resultado[paso.id] = 'pendiente';
    }
  });
  return resultado;
}

/** Distancia en línea recta entre dos puntos, en km, con un decimal. */
export function distanciaKm(a: Ubicacion, b: Ubicacion): number {
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * 6371 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

/** Base + valor por km, redondeado a $100 para arriba. */
export function costoEnvio(km: number, tarifa: { base: number; porKm: number }): number {
  return Math.ceil((tarifa.base + tarifa.porKm * km) / 100) * 100;
}

/**
 * Lo máximo que paga el cliente por el envío, en pesos. Si el viaje cuesta más,
 * el kiosco pone la diferencia: el rider siempre cobra el costo completo.
 * _Provisorio hasta definir la tarifa real._
 */
export const TOPE_ENVIO_CLIENTE = 2500;

/** La parte del envío que paga el cliente: el costo real, hasta el tope. */
export function envioCliente(costoReal: number, tope = TOPE_ENVIO_CLIENTE): number {
  return Math.min(costoReal, tope);
}

/** Lo que pone el kiosco para completar el envío del rider (sin propina). */
export function aporteKioscoEnvio(p: { costoEnvio: number; gananciaRider: number }): number {
  return Math.max(0, p.gananciaRider - p.costoEnvio);
}

/** Monto mínimo de productos por pedido, en pesos. Con el 10 % da la comisión mínima. */
export const PEDIDO_MINIMO = 15_000;

/**
 * Un kiosco recibe pedidos si está abierto, no está pausado y tiene saldo prepago
 * para pagar al menos la comisión mínima.
 */
export function puedeRecibirPedidos(k: Pick<Kiosco, 'abierto' | 'pausado' | 'saldo'>): boolean {
  return k.abierto && !k.pausado && k.saldo >= COMISION_MINIMA;
}

/** Comisión mínima de FreeDeli por pedido, en pesos. */
export const COMISION_MINIMA = 1500;

/** Porcentaje del subtotal de productos, nunca menos de COMISION_MINIMA. */
export function calcularComision(subtotal: number, porcentaje: number): number {
  return Math.max(COMISION_MINIMA, Math.round((subtotal * porcentaje) / 100));
}

/** Segundos que tiene el rider para aceptar un pedido nuevo. */
export const SEGUNDOS_PARA_ACEPTAR = 30;

/** "Conesa 1890" → "Conesa al 1800". Si no hay altura, devuelve la calle. */
export function direccionAproximada(direccion: string): string {
  const m = direccion.trim().match(/^(.*?)\s+(\d+)\b/);
  if (!m) return direccion.trim();
  return `${m[1]} al ${Math.floor(Number(m[2]) / 100) * 100}`;
}

export function armarOferta(p: Pedido, ahora: Date, segundos = SEGUNDOS_PARA_ACEPTAR): OfertaPedido {
  return {
    pedidoId: p.id,
    numero: p.numero,
    zona: p.zona,
    kioscoNombre: p.kioscoNombre,
    kioscoDireccion: p.kioscoDireccion,
    entregaAproximada: direccionAproximada(p.destino.direccion),
    cantidadProductos: cantidadProductos(p),
    gananciaRider: p.gananciaRider,
    expiraEn: new Date(ahora.getTime() + segundos * 1000),
  };
}

/** 25 → "20–30 min": el estimado del kiosco con un margen de 5 minutos. */
export function rangoTiempo(minutos: number): string {
  return `${Math.max(5, minutos - 5)}–${minutos + 5} min`;
}

/** Estados en los que el pedido sigue abierto para el usuario. */
export const ESTADOS_ABIERTOS: readonly Pedido['estado'][] = ['esperando', 'aceptado', 'retirado', 'en-camino'];

/**
 * Minutos que faltan para que llegue el pedido: desde que un rider lo acepta,
 * el tiempo estimado del kiosco. Nunca menos de 1 mientras no se entregue.
 * null si todavía no hay rider.
 */
export function minutosParaLlegar(p: Pick<Pedido, 'estado' | 'aceptadoEn'>, tiempoEstimadoMin: number, ahora: Date): number | null {
  if (p.estado === 'esperando' || !p.aceptadoEn) return null;
  if (p.estado === 'entregado' || p.estado === 'cancelado') return 0;
  const llegada = p.aceptadoEn.getTime() + tiempoEstimadoMin * 60_000;
  return Math.max(1, Math.ceil((llegada - ahora.getTime()) / 60_000));
}
