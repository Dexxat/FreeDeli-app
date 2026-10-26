import { EstadoPedido, OfertaPedido, PASOS_ESTADO, PasoEstado, Pedido, cantidadProductos } from '../models/pedido';

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
