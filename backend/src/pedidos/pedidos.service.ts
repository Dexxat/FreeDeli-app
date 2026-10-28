import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomInt } from 'node:crypto';
import { ReglasConfig } from '../comun/reglas.config.js';
import { INCLUIR_PEDIDO, aDominio, estadoDb, cambiosDb, type PedidoConItems } from '../comun/mapeo.js';
import { zonaApi } from '../comun/zonas.js';
import {
  ABANDONOS_PARA_PAUSA,
  CANCELACIONES_PARA_PAUSA,
  ESTADOS_ABIERTOS,
  inicioConteoCancelaciones,
  PEDIDO_MINIMO,
  calcularComision,
  costoEnvio,
  dentroDelArea,
  descuentoAplicable,
  puedeGanarEstrella,
  sumarEstrella,
  type EstrellaSumada,
  distanciaKm,
  envioCliente,
  nombreCorto,
  puedeRecibirPedidos,
  servicioAbierto,
  textoHorario,
  type Pedido,
  type Resultado,
} from '../dominio.js';
import type { Prisma } from '../generated/prisma/client.js';
import { EstadoPedido, FasePedido, MotivoCancelacion, TipoMovimientoSaldo } from '../generated/prisma/enums.js';
import { EventosService } from '../eventos/eventos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

type Tx = Prisma.TransactionClient;

export interface NuevoPedido {
  kioscoId: string;
  items: { productoId: string; cantidad: number }[];
}

const ABIERTOS_DB = ESTADOS_ABIERTOS.map(estadoDb);

@Injectable()
export class PedidosService {
  constructor(
    private readonly db: PrismaService,
    private readonly eventos: EventosService,
    private readonly reglas: ReglasConfig,
  ) {}

  /**
   * Aplica una transición del dominio con la fila bloqueada (SELECT … FOR UPDATE),
   * así dos acciones simultáneas sobre el mismo pedido no se pisan. Si la transición cancela el pedido,
   * aplica lo que sigue a toda cancelación.
   */
  async transicionar(
    pedidoId: string,
    autorizado: (fila: PedidoConItems) => boolean,
    paso: (p: Pedido) => Resultado,
    despues?: (tx: Tx, p: Pedido) => Promise<void>,
  ): Promise<Pedido> {
    const pedido = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Pedido" WHERE id = ${pedidoId} FOR UPDATE`;
      const fila = await tx.pedido.findUnique({ where: { id: pedidoId }, include: INCLUIR_PEDIDO });
      if (!fila || !autorizado(fila)) throw new NotFoundException('No encontramos el pedido.');
      const r = paso(aDominio(fila));
      if (!r.ok) throw new ConflictException(r.error);
      const quitados = r.pedido.itemsQuitados?.map((i) => i.productoId) ?? [];
      if (quitados.length) await tx.itemPedido.updateMany({ where: { pedidoId, productoId: { in: quitados } }, data: { quitado: true } });
      const guardado = await tx.pedido.update({ where: { id: pedidoId }, data: cambiosDb(r.pedido), include: INCLUIR_PEDIDO });
      if (r.pedido.estado === 'cancelado' && fila.estado !== EstadoPedido.CANCELADO) await this.alCancelar(tx, r.pedido);
      await despues?.(tx, r.pedido);
      return aDominio(guardado);
    });
    this.eventos.emitir({ tipo: 'pedido', pedido });
    return pedido;
  }

  /**
   * Al liberarse el pago, la comisión se descuenta del saldo prepago del kiosco. Si el cliente usó
   * saldo a favor, FreeDeli se lo devuelve al kiosco en el mismo saldo: sale de la ganancia de FreeDeli.
   */
  async liquidar(tx: Tx, p: Pedido): Promise<void> {
    await this.moverSaldoKiosco(tx, p.kioscoId, TipoMovimientoSaldo.COMISION, -p.comisionFreeDeli, `#A-${p.numero}`);
    if (p.descuentoPremio) await this.moverSaldoKiosco(tx, p.kioscoId, TipoMovimientoSaldo.PREMIO, p.descuentoPremio, `Premio #A-${p.numero}`);
  }

  private async moverSaldoKiosco(tx: Tx, kioscoId: string, tipo: TipoMovimientoSaldo, monto: number, referencia: string): Promise<void> {
    const k = await tx.kiosco.update({ where: { id: kioscoId }, data: { saldo: { increment: monto } } });
    await tx.movimientoSaldo.create({ data: { kioscoId, tipo, monto, referencia, saldoResultante: k.saldo } });
  }

  /**
   * El cliente recupera el saldo a favor usado. Si canceló el cliente y ya suma 3 en la semana, se pausa
   * su cuenta; si el rider decidió no ir y ya suma 3 abandonos, se pausa al rider hasta que Dev lo evalúe.
   */
  private async alCancelar(tx: Tx, p: Pedido): Promise<void> {
    await this.retirarOfertas(tx, p.id);
    if (p.descuentoPremio) await tx.usuario.update({ where: { id: p.usuarioId }, data: { saldoFavor: { increment: p.descuentoPremio } } });
    const motivo = p.cancelacion?.motivo;
    if (motivo === 'cliente') {
      const { habilitadoEn } = await tx.usuario.findUniqueOrThrow({ where: { id: p.usuarioId }, select: { habilitadoEn: true } });
      const cancelados = await tx.pedido.count({
        where: { usuarioId: p.usuarioId, motivoCancelacion: MotivoCancelacion.CLIENTE, creadoEn: { gte: inicioConteoCancelaciones(new Date(), habilitadoEn) } },
      });
      if (cancelados >= CANCELACIONES_PARA_PAUSA) await tx.usuario.update({ where: { id: p.usuarioId }, data: { pausado: true } });
    }
    if (motivo === 'rider' && p.riderId && (await this.abandonos(p.riderId, tx)) >= ABANDONOS_PARA_PAUSA) {
      await this.pausarRider(tx, p.riderId);
    }
  }

  /** Vence las ofertas vigentes del pedido: el rider deja de verlo y puede recibir otro. */
  private async retirarOfertas(tx: Tx, pedidoId: string): Promise<void> {
    const ahora = new Date();
    const vigentes = await tx.oferta.findMany({ where: { pedidoId, expiraEn: { gt: ahora } }, select: { riderId: true } });
    if (vigentes.length === 0) return;
    await tx.oferta.updateMany({ where: { pedidoId, expiraEn: { gt: ahora } }, data: { expiraEn: ahora } });
    for (const { riderId } of vigentes) this.eventos.emitir({ tipo: 'oferta', riderId, oferta: null });
  }

  /** Pedidos que el rider aceptó y decidió no hacer, desde que Dev lo habilitó. */
  async abandonos(riderId: string, tx: Tx = this.db): Promise<number> {
    const { habilitadoEn } = await tx.rider.findUniqueOrThrow({ where: { id: riderId }, select: { habilitadoEn: true } });
    return tx.pedido.count({ where: { riderId, motivoCancelacion: MotivoCancelacion.RIDER, creadoEn: { gte: habilitadoEn } } });
  }

  /** Pausado, el rider pasa a OFF y no puede volver a conectarse. */
  async pausarRider(tx: Tx, riderId: string): Promise<void> {
    await tx.rider.update({ where: { id: riderId }, data: { pausado: true, disponible: false } });
    await tx.sesionOnline.updateMany({ where: { riderId, hasta: null }, data: { hasta: new Date() } });
  }

  /** FREEDELI RUSH: suma la estrella del pedido si el servidor confirma los 10 minutos en camino. */
  async sumarEstrella(usuarioId: string, pedidoId: string): Promise<EstrellaSumada> {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Pedido" WHERE id = ${pedidoId} FOR UPDATE`;
      const fila = await tx.pedido.findFirst({ where: { id: pedidoId, usuarioId }, include: INCLUIR_PEDIDO });
      if (!fila) throw new NotFoundException('No encontramos el pedido.');
      const permitido = puedeGanarEstrella(aDominio(fila), new Date());
      if (!permitido.ok) throw new ConflictException(permitido.error);
      const usuario = await tx.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
      const resultado = sumarEstrella(usuario);
      await tx.pedido.update({ where: { id: pedidoId }, data: { estrellaGanada: true } });
      await tx.usuario.update({ where: { id: usuarioId }, data: { estrellas: resultado.estrellas, saldoFavor: resultado.saldoFavor } });
      return resultado;
    });
  }

  async crear(usuarioId: string, nuevo: NuevoPedido): Promise<Pedido> {
    if (!this.reglas.horarioLibre && !servicioAbierto(new Date())) {
      throw new ConflictException({ statusCode: 409, codigo: 'fuera-de-horario', message: `FreeDeli toma pedidos de ${textoHorario()}.` });
    }
    const usuario = await this.db.usuario.findUniqueOrThrow({ where: { id: usuarioId } });
    if (usuario.pausado) {
      throw new ConflictException({ statusCode: 409, codigo: 'cuenta-pausada', message: 'Tu cuenta está pausada por cancelaciones. Escribinos por WhatsApp.' });
    }
    const kiosco = await this.db.kiosco.findUnique({ where: { id: nuevo.kioscoId }, include: { cuenta: true } });
    if (!kiosco || kiosco.cuenta?.estado !== 'APROBADA' || !puedeRecibirPedidos(kiosco)) {
      throw new ConflictException({ statusCode: 409, codigo: 'kiosco-cerrado', message: 'El kiosco no está recibiendo pedidos.' });
    }
    const catalogo = await this.db.producto.findMany({ where: { kioscoId: kiosco.id, disponible: true } });
    const lineas = nuevo.items.filter((i) => i.cantidad > 0);
    if (lineas.length === 0) throw new BadRequestException({ statusCode: 400, codigo: 'sin-productos', message: 'Agregá al menos un producto.' });
    const items = lineas.map((l) => {
      const prod = catalogo.find((p) => p.id === l.productoId);
      if (!prod) throw new ConflictException({ statusCode: 409, codigo: 'producto-inexistente', message: 'Algún producto ya no está disponible.' });
      return { productoId: prod.id, nombre: prod.nombre, cantidad: l.cantidad, precioUnitario: prod.precio };
    });
    const subtotal = items.reduce((a, i) => a + i.cantidad * i.precioUnitario, 0);
    if (subtotal < PEDIDO_MINIMO) {
      throw new ConflictException({ statusCode: 409, codigo: 'pedido-minimo', message: `El pedido mínimo es de $${PEDIDO_MINIMO.toLocaleString('es-AR')} en productos.` });
    }
    if (!dentroDelArea({ lat: usuario.lat, lng: usuario.lng })) {
      throw new ConflictException({ statusCode: 409, codigo: 'fuera-de-cobertura', message: 'Tu dirección está fuera del área donde entrega FreeDeli.' });
    }
    const km = distanciaKm({ lat: kiosco.lat, lng: kiosco.lng }, { lat: usuario.lat, lng: usuario.lng });
    // El rider cobra el viaje completo; el cliente paga hasta el tope y el kiosco pone el resto.
    const viaje = costoEnvio(km, this.reglas.tarifaEnvio);
    // Un pedido abierto por usuario: se bloquea la fila del usuario para que dos pedidos
    // simultáneos (doble toque, dos pestañas) no pasen los dos el control.
    const fila = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Usuario" WHERE id = ${usuarioId} FOR UPDATE`;
      if (await tx.pedido.findFirst({ where: { usuarioId, estado: { in: ABIERTOS_DB } } })) {
        throw new ConflictException({ statusCode: 409, codigo: 'pedido-en-curso', message: 'Ya tenés un pedido en curso.' });
      }
      // El saldo a favor se usa solo, y se reserva acá: si cancela, se devuelve.
      const { saldoFavor } = await tx.usuario.findUniqueOrThrow({ where: { id: usuarioId }, select: { saldoFavor: true } });
      const descuentoPremio = descuentoAplicable(saldoFavor, subtotal + envioCliente(viaje));
      if (descuentoPremio) await tx.usuario.update({ where: { id: usuarioId }, data: { saldoFavor: { decrement: descuentoPremio } } });
      return tx.pedido.create({
        data: {
          zona: kiosco.zona,
          kioscoId: kiosco.id,
          usuarioId,
          destinoNombre: nombreCorto(usuario.nombre),
          destinoDireccion: usuario.direccion,
          destinoNotas: usuario.notas,
          distanciaKm: km,
          costoEnvio: envioCliente(viaje),
          gananciaRider: viaje,
          aliasKiosco: kiosco.aliasCobro,
          comisionFreeDeli: calcularComision(subtotal, this.reglas.comisionPorcentaje),
          descuentoPremio,
          pin: randomInt(0, 10_000).toString().padStart(4, '0'),
          estado: EstadoPedido.ESPERANDO,
          fase: FasePedido.STOCK,
          items: { create: items },
        },
        include: INCLUIR_PEDIDO,
      });
    });
    const pedido = aDominio(fila);
    this.eventos.emitir({ tipo: 'pedido', pedido });
    return pedido;
  }

  async buscar(where: Prisma.PedidoWhereInput, orden: 'asc' | 'desc' = 'desc', limite?: number): Promise<Pedido[]> {
    const filas = await this.db.pedido.findMany({ where, include: INCLUIR_PEDIDO, orderBy: { creadoEn: orden }, take: limite });
    return filas.map(aDominio);
  }

  async uno(where: Prisma.PedidoWhereInput): Promise<Pedido> {
    const fila = await this.db.pedido.findFirst({ where, include: INCLUIR_PEDIDO });
    if (!fila) throw new NotFoundException('No encontramos el pedido.');
    return aDominio(fila);
  }

  abiertos(): EstadoPedido[] {
    return ABIERTOS_DB;
  }

  zona = zonaApi;
}
