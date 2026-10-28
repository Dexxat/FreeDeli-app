import { EstadoPago, EstadoPedido, FasePedido, MotivoCancelacion } from '../generated/prisma/enums.js';
import type { Prisma } from '../generated/prisma/client.js';
import type { MotivoCancelacion as MotivoDominio, Pedido as PedidoDominio } from '../dominio.js';
import { zonaApi } from './zonas.js';

/** Enums de la base ↔ textos que usan las apps. */
const ESTADOS: Record<EstadoPedido, PedidoDominio['estado']> = {
  ESPERANDO: 'esperando',
  ACEPTADO: 'aceptado',
  RETIRADO: 'retirado',
  EN_CAMINO: 'en-camino',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
};
const FASES: Record<FasePedido, NonNullable<PedidoDominio['fase']>> = {
  STOCK: 'stock',
  AJUSTE: 'ajuste',
  TRANSFERENCIA: 'transferencia',
  RIDER: 'rider',
  APROBACION: 'aprobacion',
};
const PAGOS: Record<EstadoPago, PedidoDominio['pago']> = { PENDIENTE: 'pendiente', TRANSFERIDO: 'transferido', LIBERADO: 'liberado' };
const MOTIVOS: Record<MotivoCancelacion, MotivoDominio> = { CLIENTE: 'cliente', SIN_RIDER: 'sin-rider', SIN_STOCK: 'sin-stock', RIDER: 'rider', DEV: 'dev' };

const invertir = <K extends string, V extends string>(r: Record<K, V>) => Object.fromEntries(Object.entries(r).map(([k, v]) => [v, k])) as Record<V, K>;
const ESTADOS_DB = invertir(ESTADOS);
const FASES_DB = invertir(FASES);
const PAGOS_DB = invertir(PAGOS);
const MOTIVOS_DB = invertir(MOTIVOS);

export const estadoDb = (e: PedidoDominio['estado']): EstadoPedido => ESTADOS_DB[e];

/** Lo que hay que traer de la base para armar un pedido completo. */
export const INCLUIR_PEDIDO = { items: true, kiosco: { select: { nombre: true, direccion: true } } } as const;
export type PedidoConItems = Prisma.PedidoGetPayload<{ include: typeof INCLUIR_PEDIDO }>;

/** Fila de la base → pedido del dominio (el mismo modelo que usan las apps). */
export function aDominio(p: PedidoConItems): PedidoDominio {
  const item = (i: PedidoConItems['items'][number]) => ({ productoId: i.productoId, nombre: i.nombre, cantidad: i.cantidad, precioUnitario: i.precioUnitario });
  const quitados = p.items.filter((i) => i.quitado).map(item);
  return {
    id: p.id,
    numero: p.numero,
    zona: zonaApi(p.zona),
    kioscoId: p.kioscoId,
    kioscoNombre: p.kiosco.nombre,
    kioscoDireccion: p.kiosco.direccion,
    usuarioId: p.usuarioId,
    destino: { nombre: p.destinoNombre, direccion: p.destinoDireccion, notas: p.destinoNotas ?? undefined, ubicacion: { lat: p.destinoLat, lng: p.destinoLng } },
    items: p.items.filter((i) => !i.quitado).map(item),
    itemsQuitados: quitados.length ? quitados : undefined,
    costoEnvio: p.costoEnvio,
    distanciaKm: p.distanciaKm,
    propina: p.propina,
    gananciaRider: p.gananciaRider,
    pago: PAGOS[p.pago],
    aliasKiosco: p.aliasKiosco,
    comisionFreeDeli: p.comisionFreeDeli,
    descuentoPremio: p.descuentoPremio,
    pin: p.pin,
    estado: ESTADOS[p.estado],
    fase: p.fase ? FASES[p.fase] : undefined,
    ridersRechazados: p.ridersRechazados.length ? p.ridersRechazados : undefined,
    retiro: p.retiroKiosco || p.retiroRider ? { kiosco: p.retiroKiosco ?? undefined, rider: p.retiroRider ?? undefined } : undefined,
    riderId: p.riderId ?? undefined,
    creadoEn: p.creadoEn,
    aceptadoEn: p.aceptadoEn ?? undefined,
    enCaminoEn: p.enCaminoEn ?? undefined,
    estrellaGanada: p.estrellaGanada,
    entregadoEn: p.entregadoEn ?? undefined,
    buscandoRiderDesde: p.buscandoRiderDesde ?? undefined,
    cancelacion: p.motivoCancelacion
      ? { motivo: MOTIVOS[p.motivoCancelacion], reintegro: p.reintegro, riderCobra: p.riderCobra, reintegradoEn: p.reintegradoEn ?? undefined }
      : undefined,
    posicionRider: p.riderLat !== null && p.riderLng !== null && p.riderPosicionEn ? { lat: p.riderLat, lng: p.riderLng, en: p.riderPosicionEn } : undefined,
  };
}

/** Lo que cambió una transición, listo para guardar. */
export function cambiosDb(p: PedidoDominio): Prisma.PedidoUncheckedUpdateInput {
  return {
    estado: ESTADOS_DB[p.estado],
    fase: p.fase ? FASES_DB[p.fase] : null,
    pago: PAGOS_DB[p.pago],
    comisionFreeDeli: p.comisionFreeDeli,
    ridersRechazados: p.ridersRechazados ?? [],
    retiroKiosco: p.retiro?.kiosco ?? null,
    retiroRider: p.retiro?.rider ?? null,
    riderId: p.riderId ?? null,
    aceptadoEn: p.aceptadoEn ?? null,
    enCaminoEn: p.enCaminoEn ?? null,
    estrellaGanada: p.estrellaGanada ?? false,
    entregadoEn: p.entregadoEn ?? null,
    buscandoRiderDesde: p.buscandoRiderDesde ?? null,
    motivoCancelacion: p.cancelacion ? MOTIVOS_DB[p.cancelacion.motivo] : null,
    reintegro: p.cancelacion?.reintegro ?? 0,
    riderCobra: p.cancelacion?.riderCobra ?? false,
    reintegradoEn: p.cancelacion?.reintegradoEn ?? null,
    riderLat: p.posicionRider?.lat ?? null,
    riderLng: p.posicionRider?.lng ?? null,
    riderPosicionEn: p.posicionRider?.en ?? null,
  };
}
