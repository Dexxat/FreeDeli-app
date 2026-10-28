import { MotivoCancelacion, Pedido, subtotalProductos } from '../models/pedido.js';
import { esperaSinRider, reintegroAlCancelar, reintegroPendiente } from './cancelacion.rules.js';
import { ESTADOS_ABIERTOS, calcularComision } from './pedido.rules.js';

/**
 * Transiciones del flujo de un pedido. Son funciones puras: reciben el pedido y
 * devuelven el pedido nuevo, o un error si la transición no corresponde.
 * Las usan los mocks y las va a usar el backend.
 */
export type Resultado = { ok: true; pedido: Pedido } | { ok: false; error: string };

const ok = (pedido: Pedido): Resultado => ({ ok: true, pedido });
const error = (texto: string): Resultado => ({ ok: false, error: texto });

function enFase(p: Pedido, fase: Pedido['fase']): boolean {
  return p.estado === 'esperando' && p.fase === fase;
}

/** El kiosco confirma el stock. Si faltan productos, los quita y el cliente tiene que aceptar el ajuste. */
export function confirmarStock(p: Pedido, faltantes: readonly string[], comisionPorcentaje: number): Resultado {
  if (!enFase(p, 'stock')) return error('El pedido no está esperando confirmación de stock.');
  if (faltantes.length === 0) return ok({ ...p, fase: 'transferencia' });
  const items = p.items.filter((i) => !faltantes.includes(i.productoId));
  const itemsQuitados = p.items.filter((i) => faltantes.includes(i.productoId));
  if (items.length === 0) return ok({ ...cancelado(p, 'sin-stock', false), items: [], itemsQuitados });
  return ok({
    ...p,
    items,
    itemsQuitados,
    comisionFreeDeli: calcularComision(subtotalProductos({ items }), comisionPorcentaje),
    fase: 'ajuste',
  });
}

/** El cliente acepta el pedido ajustado. */
export function aceptarAjuste(p: Pedido): Resultado {
  if (!enFase(p, 'ajuste')) return error('No hay un ajuste para aceptar.');
  return ok({ ...p, fase: 'transferencia' });
}

function cancelado(p: Pedido, motivo: MotivoCancelacion, riderCobra: boolean): Pedido {
  return { ...p, estado: 'cancelado', fase: undefined, cancelacion: { motivo, riderCobra, reintegro: reintegroAlCancelar(p, riderCobra) } };
}

const abierto = (p: Pedido) => ESTADOS_ABIERTOS.includes(p.estado);

/**
 * El cliente cancela, en cualquier momento antes de la entrega. Si ya transfirió, el kiosco le devuelve
 * el dinero; si el rider ya hizo más de la mitad del viaje, se descuenta el envío, que cobra el rider.
 * Si lleva MINUTOS_SIN_RIDER sin rider, la cancelación no le cuenta en contra.
 */
export function cancelarPorCliente(p: Pedido, ahora: Date, riderPasoLaMitad = false): Resultado {
  if (!abierto(p)) return error('El pedido ya no se puede cancelar.');
  const riderCobra = riderPasoLaMitad && p.estado === 'en-camino';
  return ok(cancelado(p, esperaSinRider(p, ahora) ? 'sin-rider' : 'cliente', riderCobra));
}

/** El cliente elige seguir esperando un rider: se le vuelve a preguntar en MINUTOS_SIN_RIDER. */
export function seguirEsperandoRider(p: Pedido, ahora: Date): Resultado {
  if (!enFase(p, 'rider')) return error('El pedido no está buscando rider.');
  return ok({ ...p, buscandoRiderDesde: ahora });
}

/**
 * Dev cancela un pedido abierto, con reintegro total si el cliente ya pagó.
 * `rider`: el rider aceptó y decidió no ir (le cuenta en contra).
 */
export function cancelarPorDev(p: Pedido, motivo: Extract<MotivoCancelacion, 'rider' | 'dev'>): Resultado {
  if (!abierto(p)) return error('El pedido ya está cerrado.');
  if (motivo === 'rider' && (!p.riderId || p.estado === 'esperando')) return error('El pedido no tiene un rider asignado.');
  return ok(cancelado(p, motivo, false));
}

/** El kiosco avisa que devolvió el dinero al cliente. */
export function marcarReintegrado(p: Pedido, ahora: Date): Resultado {
  if (p.estado !== 'cancelado' || !p.cancelacion?.reintegro) return error('Este pedido no tiene dinero para devolver.');
  if (p.cancelacion.reintegradoEn) return ok(p);
  return ok({ ...p, cancelacion: { ...p.cancelacion, reintegradoEn: ahora } });
}

/** El kiosco confirma que recibió la transferencia. Recién ahí se busca rider. */
export function confirmarTransferencia(p: Pedido, ahora: Date): Resultado {
  if (!enFase(p, 'transferencia')) return error('El pedido no está esperando la transferencia.');
  return ok({ ...p, pago: 'transferido', fase: 'rider', buscandoRiderDesde: ahora });
}

/** Un rider acepta la oferta. Queda a la espera de que el kiosco lo apruebe. */
export function asignarRider(p: Pedido, riderId: string): Resultado {
  if (!enFase(p, 'rider')) return error('Este pedido ya no está disponible.');
  if (p.ridersRechazados?.includes(riderId)) return error('El kiosco ya rechazó a este rider para el pedido.');
  return ok({ ...p, riderId, fase: 'aprobacion' });
}

/** El kiosco aprueba o rechaza al rider. Si lo rechaza, se vuelve a buscar. */
export function aprobarRider(p: Pedido, aprobado: boolean, ahora: Date): Resultado {
  if (!enFase(p, 'aprobacion') || !p.riderId) return error('No hay un rider para aprobar.');
  if (aprobado) return ok({ ...p, estado: 'aceptado', fase: undefined, aceptadoEn: ahora });
  return ok({
    ...p,
    riderId: undefined,
    fase: 'rider',
    ridersRechazados: [...(p.ridersRechazados ?? []), p.riderId],
  });
}

/** Kiosco o rider confirman el retiro. Con las dos confirmaciones pasa a Retirado. */
export function confirmarRetiro(p: Pedido, quien: 'kiosco' | 'rider', ahora: Date): Resultado {
  if (p.estado !== 'aceptado') return error('El pedido no está listo para retirar.');
  const retiro = { ...p.retiro, [quien]: p.retiro?.[quien] ?? ahora };
  return ok({ ...p, retiro, estado: retiro.kiosco && retiro.rider ? 'retirado' : 'aceptado' });
}

/** El rider sale hacia el cliente. */
export function salirEnCamino(p: Pedido, ahora: Date): Resultado {
  if (p.estado !== 'retirado') return error('Primero tiene que estar retirado.');
  return ok({ ...p, estado: 'en-camino', enCaminoEn: ahora });
}

/** El rider ingresa el PIN del cliente. Si coincide, se entrega y se libera el pago. */
export function entregarConPin(p: Pedido, pin: string, ahora: Date): Resultado {
  if (p.estado !== 'en-camino') return error('Este pedido todavía no está en camino.');
  if (p.pin !== pin) return error('PIN incorrecto.');
  return ok({ ...p, estado: 'entregado', entregadoEn: ahora, pago: 'liberado' });
}

/** Dev cierra el pedido sin PIN, cuando el rider entregó pero el cliente no pudo darle el PIN. */
export function entregarSinPin(p: Pedido, ahora: Date): Resultado {
  if (p.estado !== 'retirado' && p.estado !== 'en-camino') return error('Solo se puede marcar entregado un pedido que el rider ya retiró.');
  return ok({ ...p, estado: 'entregado', entregadoEn: ahora, pago: 'liberado' });
}

/** Qué tiene que hacer cada parte con el pedido ahora. Útil para simulaciones y avisos. */
export function quienDebeActuar(p: Pedido): 'kiosco' | 'cliente' | 'rider' | 'kiosco-y-rider' | null {
  if (p.estado === 'esperando') {
    switch (p.fase) {
      case 'stock':
      case 'transferencia':
      case 'aprobacion':
        return 'kiosco';
      case 'ajuste':
        return 'cliente';
      case 'rider':
        return 'rider';
      default:
        return null;
    }
  }
  if (p.estado === 'aceptado') {
    if (!p.retiro?.kiosco && !p.retiro?.rider) return 'kiosco-y-rider';
    return p.retiro?.kiosco ? 'rider' : 'kiosco';
  }
  if (p.estado === 'retirado' || p.estado === 'en-camino') return 'rider';
  // Cancelado después de pagar: el kiosco tiene que devolverle el dinero al cliente.
  if (reintegroPendiente(p)) return 'kiosco';
  return null;
}
