import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Subscription } from 'rxjs';
import { INCLUIR_PEDIDO, aDominio } from '../comun/mapeo.js';
import { ReglasConfig } from '../comun/reglas.config.js';
import { armarOferta, asignarRider, type OfertaPedido } from '../dominio.js';
import { EstadoCuenta, EstadoPedido, FasePedido } from '../generated/prisma/enums.js';
import { EventosService } from '../eventos/eventos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PedidosService } from './pedidos.service.js';
import { AvisosRiderService } from '../avisos/avisos-rider.service.js';

/** No se le vuelve a ofrecer el mismo pedido a un rider hasta pasado este tiempo. */
const ESPERA_REOFERTA_MS = 2 * 60_000;

/**
 * Ofrece a los riders los pedidos que esperan rider (fase RIDER): uno por vez,
 * con vencimiento. Si vence o lo rechaza, pasa al siguiente.
 */
@Injectable()
export class DespachoService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(DespachoService.name);
  private sub?: Subscription;
  private reloj?: ReturnType<typeof setInterval>;
  private ultimoBarrido = new Date();

  constructor(
    private readonly db: PrismaService,
    private readonly eventos: EventosService,
    private readonly pedidos: PedidosService,
    private readonly reglas: ReglasConfig,
    private readonly config: ConfigService,
    private readonly avisos: AvisosRiderService,
  ) {}

  onModuleInit(): void {
    this.sub = this.eventos.flujo$.subscribe((e) => {
      if (e.tipo === 'pedido' && e.pedido.estado === 'esperando' && e.pedido.fase === 'rider') void this.ofrecer(e.pedido.id);
    });
    if (this.config.get('DESPACHO_AUTOMATICO') !== 'false') {
      this.reloj = setInterval(() => void this.barrer().catch((err) => this.log.error(err)), 5_000);
    }
  }

  onModuleDestroy(): void {
    this.sub?.unsubscribe();
    if (this.reloj) clearInterval(this.reloj);
  }

  /** Vence ofertas viejas y ofrece los pedidos que siguen sin rider. */
  async barrer(): Promise<void> {
    const ahora = new Date();
    const vencidas = await this.db.oferta.findMany({ where: { expiraEn: { gt: this.ultimoBarrido, lte: ahora } } });
    this.ultimoBarrido = ahora;
    for (const o of vencidas) this.eventos.emitir({ tipo: 'oferta', riderId: o.riderId, oferta: null });
    const sinRider = await this.db.pedido.findMany({ where: { estado: EstadoPedido.ESPERANDO, fase: FasePedido.RIDER }, select: { id: true } });
    for (const p of sinRider) await this.ofrecer(p.id);
  }

  async ofrecer(pedidoId: string): Promise<void> {
    const ahora = new Date();
    const oferta = await this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Pedido" WHERE id = ${pedidoId} FOR UPDATE`;
      const fila = await tx.pedido.findUnique({ where: { id: pedidoId }, include: INCLUIR_PEDIDO });
      if (!fila || fila.estado !== EstadoPedido.ESPERANDO || fila.fase !== FasePedido.RIDER) return null;
      if (await tx.oferta.findFirst({ where: { pedidoId, expiraEn: { gt: ahora } } })) return null;

      const ocupados = await tx.pedido.findMany({
        where: {
          riderId: { not: null },
          OR: [
            { estado: { in: [EstadoPedido.ACEPTADO, EstadoPedido.RETIRADO, EstadoPedido.EN_CAMINO] } },
            { estado: EstadoPedido.ESPERANDO, fase: FasePedido.APROBACION },
          ],
        },
        select: { riderId: true },
      });
      const conOferta = await tx.oferta.findMany({ where: { expiraEn: { gt: ahora } }, select: { riderId: true } });
      const recientes = await tx.oferta.findMany({ where: { pedidoId, creadaEn: { gt: new Date(ahora.getTime() - ESPERA_REOFERTA_MS) } }, select: { riderId: true } });
      const excluidos = new Set([...ocupados.map((x) => x.riderId!), ...conOferta.map((x) => x.riderId), ...recientes.map((x) => x.riderId), ...fila.ridersRechazados]);

      const candidatos = await tx.rider.findMany({
        where: { disponible: true, pausado: false, zonas: { has: fila.zona }, cuenta: { estado: EstadoCuenta.APROBADA }, id: { notIn: [...excluidos] } },
        include: { ofertas: { orderBy: { creadaEn: 'desc' }, take: 1 } },
      });
      if (candidatos.length === 0) return null;
      // Primero el que hace más tiempo que no recibe una oferta.
      candidatos.sort((a, b) => (a.ofertas[0]?.creadaEn.getTime() ?? 0) - (b.ofertas[0]?.creadaEn.getTime() ?? 0));
      const rider = candidatos[0];
      const expiraEn = new Date(ahora.getTime() + this.reglas.segundosOferta * 1000);
      await tx.oferta.upsert({
        where: { pedidoId_riderId: { pedidoId, riderId: rider.id } },
        create: { pedidoId, riderId: rider.id, expiraEn },
        update: { expiraEn, creadaEn: ahora },
      });
      return { riderId: rider.id, oferta: { ...armarOferta(aDominio(fila), ahora, this.reglas.segundosOferta), expiraEn } };
    });
    if (!oferta) return;
    this.eventos.emitir({ tipo: 'oferta', ...oferta });
    this.avisos.pedidoNuevo(oferta.riderId, oferta.oferta, this.reglas.segundosOferta);
  }

  async ofertaActual(riderId: string): Promise<OfertaPedido | null> {
    const o = await this.db.oferta.findFirst({
      where: { riderId, expiraEn: { gt: new Date() }, pedido: { estado: EstadoPedido.ESPERANDO, fase: FasePedido.RIDER } },
      include: { pedido: { include: INCLUIR_PEDIDO } },
    });
    return o ? { ...armarOferta(aDominio(o.pedido), o.creadaEn, this.reglas.segundosOferta), expiraEn: o.expiraEn } : null;
  }

  async aceptar(riderId: string, pedidoId: string) {
    const vigente = await this.db.oferta.findFirst({ where: { riderId, pedidoId, expiraEn: { gt: new Date() } } });
    const pedido = await this.pedidos.transicionar(
      pedidoId,
      () => !!vigente,
      (p) => asignarRider(p, riderId),
      async (tx) => {
        await tx.oferta.updateMany({ where: { pedidoId }, data: { expiraEn: new Date() } });
      },
    );
    this.eventos.emitir({ tipo: 'oferta', riderId, oferta: null });
    return pedido;
  }

  async rechazar(riderId: string, pedidoId: string): Promise<void> {
    await this.db.oferta.updateMany({ where: { riderId, pedidoId, expiraEn: { gt: new Date() } }, data: { expiraEn: new Date() } });
    this.eventos.emitir({ tipo: 'oferta', riderId, oferta: null });
    await this.ofrecer(pedidoId);
  }
}
