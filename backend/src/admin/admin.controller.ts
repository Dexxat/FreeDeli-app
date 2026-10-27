import { Body, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { Roles } from '../auth/sesion.js';
import { PERIODOS_ADMIN, periodoDe, zonasDe } from '../comun/consultas.js';
import { zonaApi } from '../comun/zonas.js';
import {
  COMISION_MINIMA,
  MINUTOS_DEMORA,
  SALDO_BAJO,
  entregaAdmin,
  filaMain,
  gananciaFreeDeli,
  gananciasAdmin,
  inicioDelDia,
  movimientoDePedido,
  puedeRecibirPedidos,
  rangoPeriodo,
} from '../dominio.js';
import type { Kiosco } from '../generated/prisma/client.js';
import { EstadoCuenta, EstadoPedido, Rol, TipoMovimientoSaldo } from '../generated/prisma/enums.js';
import { CargaSaldoDto, PausaDto } from '../pedidos/dto.js';
import { PedidosService } from '../pedidos/pedidos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DocumentosService } from '../rider/documentos.service.js';

const EN_CURSO = [EstadoPedido.ACEPTADO, EstadoPedido.RETIRADO, EstadoPedido.EN_CAMINO];

/** FreeDeli Dev: una sola instancia, un solo usuario (el dueño). */
@Roles(Rol.DEV)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly db: PrismaService,
    private readonly pedidos: PedidosService,
    private readonly documentos: DocumentosService,
  ) {}

  // ---------- Kioscos ----------

  private async kioscoAdmin(k: Kiosco) {
    const hoy = inicioDelDia(new Date());
    const deHoy = await this.db.pedido.findMany({ where: { kioscoId: k.id, creadoEn: { gte: hoy } }, select: { estado: true, comisionFreeDeli: true } });
    return {
      ...k,
      zona: zonaApi(k.zona),
      ubicacion: { lat: k.lat, lng: k.lng },
      costoEnvio: 0,
      pedidosHoy: deHoy.length,
      comisionHoy: deHoy.filter((p) => p.estado === EstadoPedido.ENTREGADO).reduce((a, p) => a + p.comisionFreeDeli, 0),
      saldoBajo: k.saldo < SALDO_BAJO,
      sinSaldo: k.saldo < COMISION_MINIMA,
    };
  }

  @Get('kioscos')
  async kioscos() {
    const ks = await this.db.kiosco.findMany({ where: { cuenta: { estado: EstadoCuenta.APROBADA } }, orderBy: { nombre: 'asc' } });
    return Promise.all(ks.map((k) => this.kioscoAdmin(k)));
  }

  @Get('kioscos/:id')
  async kiosco(@Param('id', ParseUUIDPipe) id: string) {
    const k = await this.db.kiosco.findUnique({ where: { id } });
    if (!k) throw new NotFoundException('No existe ese kiosco.');
    return this.kioscoAdmin(k);
  }

  @Get('kioscos/:id/movimientos')
  async movimientos(@Param('id', ParseUUIDPipe) id: string, @Query('periodo') periodo?: string) {
    const { desde, hasta } = rangoPeriodo(periodoDe(periodo, ['hoy', 'semana', 'mes'] as const), new Date());
    return (await this.pedidos.buscar({ kioscoId: id, creadoEn: { gte: desde, lt: hasta } })).map(movimientoDePedido);
  }

  @Get('kioscos/:id/saldo')
  saldo(@Param('id', ParseUUIDPipe) id: string) {
    return this.db.movimientoSaldo.findMany({ where: { kioscoId: id }, orderBy: { fecha: 'desc' }, take: 200 });
  }

  /** Acredita una carga de saldo: el kiosco transfirió ese monto al alias de FreeDeli. */
  @Post('kioscos/:id/saldo') @HttpCode(200)
  async acreditar(@Param('id', ParseUUIDPipe) id: string, @Body() dto: CargaSaldoDto) {
    return this.db.$transaction(async (tx) => {
      const existe = await tx.kiosco.findUnique({ where: { id } });
      if (!existe) throw new NotFoundException('No existe ese kiosco.');
      const k = await tx.kiosco.update({ where: { id }, data: { saldo: { increment: dto.monto } } });
      await tx.movimientoSaldo.create({
        data: { kioscoId: id, tipo: TipoMovimientoSaldo.CARGA, monto: dto.monto, referencia: dto.referencia?.trim() || 'Transferencia a FreeDeli', saldoResultante: k.saldo },
      });
      return { id: k.id, saldo: k.saldo };
    });
  }

  @Post('kioscos/:id/pausa') @HttpCode(200)
  async pausarKiosco(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PausaDto) {
    const r = await this.db.kiosco.updateMany({ where: { id }, data: { pausado: dto.pausado } });
    if (r.count === 0) throw new NotFoundException('No existe ese kiosco.');
    return this.kiosco(id);
  }

  // ---------- Riders ----------

  @Get('riders/:id')
  async rider(@Param('id', ParseUUIDPipe) id: string) {
    const r = await this.db.rider.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('No existe ese rider.');
    const hoy = inicioDelDia(new Date());
    const entregadosHoy = await this.db.pedido.findMany({ where: { riderId: id, estado: EstadoPedido.ENTREGADO, creadoEn: { gte: hoy } }, select: { gananciaRider: true, propina: true } });
    const [enCurso] = await this.pedidos.buscar({ riderId: id, estado: { in: EN_CURSO } }, 'desc', 1);
    return {
      id: r.id,
      nombre: r.nombre,
      telefono: r.telefono,
      vehiculo: { modelo: r.vehiculoModelo, patente: r.patente },
      zonas: r.zonas.map(zonaApi),
      disponible: r.disponible,
      pausado: r.pausado,
      riderDesde: r.riderDesde,
      entregasHoy: entregadosHoy.length,
      ganadoHoy: entregadosHoy.reduce((a, p) => a + p.gananciaRider + p.propina, 0),
      enCurso: enCurso ?? null,
    };
  }

  @Get('riders/:id/documentos')
  documentosRider(@Param('id', ParseUUIDPipe) id: string) {
    return this.documentos.deRider(id);
  }

  @Get('riders/:id/envios')
  async envios(@Param('id', ParseUUIDPipe) id: string, @Query('periodo') periodo?: string) {
    const { desde, hasta } = rangoPeriodo(periodoDe(periodo, PERIODOS_ADMIN), new Date());
    const nombre = (await this.db.rider.findUnique({ where: { id }, select: { nombre: true } }))?.nombre;
    return (await this.pedidos.buscar({ riderId: id, creadoEn: { gte: desde, lt: hasta } })).map((p) => filaMain(p, nombre));
  }

  /** Pausado, pasa a OFF y no puede volver a conectarse. */
  @Post('riders/:id/pausa') @HttpCode(200)
  async pausarRider(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PausaDto) {
    const r = await this.db.rider.updateMany({ where: { id }, data: dto.pausado ? { pausado: true, disponible: false } : { pausado: false } });
    if (r.count === 0) throw new NotFoundException('No existe ese rider.');
    if (dto.pausado) await this.db.sesionOnline.updateMany({ where: { riderId: id, hasta: null }, data: { hasta: new Date() } });
    return this.rider(id);
  }

  // ---------- MAIN, Ganancias y Entregas ----------

  private async nombresRiders(): Promise<Map<string, string>> {
    return new Map((await this.db.rider.findMany({ select: { id: true, nombre: true } })).map((r) => [r.id, r.nombre]));
  }

  @Get('resumen')
  async resumen() {
    const ahora = new Date();
    const hoy = inicioDelDia(ahora);
    const [deHoy, enCurso, kioscos, ridersActivos, demorados] = await Promise.all([
      this.db.pedido.findMany({ where: { creadoEn: { gte: hoy } }, select: { estado: true, comisionFreeDeli: true, descuentoPremio: true } }),
      this.db.pedido.count({ where: { estado: { in: this.pedidos.abiertos() } } }),
      this.db.kiosco.findMany({ where: { cuenta: { estado: EstadoCuenta.APROBADA } } }),
      this.db.rider.count({ where: { disponible: true, pausado: false } }),
      this.db.pedido.findMany({ where: { estado: EstadoPedido.ESPERANDO, creadoEn: { lte: new Date(ahora.getTime() - MINUTOS_DEMORA * 60_000) } }, select: { numero: true, kioscoId: true, creadoEn: true } }),
    ]);
    const entregados = deHoy.filter((p) => p.estado === EstadoPedido.ENTREGADO);
    return {
      pedidosHoy: deHoy.length,
      entregadosHoy: entregados.length,
      enCurso,
      comisionesHoy: entregados.reduce((a, p) => a + gananciaFreeDeli(p), 0),
      kioscosAbiertos: kioscos.filter((k) => puedeRecibirPedidos(k)).length,
      ridersActivos,
      alertas: [
        ...kioscos.filter((k) => k.saldo < SALDO_BAJO).map((k) => ({ tipo: 'saldo-bajo', texto: `${k.nombre} tiene saldo bajo`, ruta: `/kioscos/${k.id}` })),
        ...demorados.map((p) => ({
          tipo: 'pedido-demorado',
          texto: `#A-${p.numero} lleva ${Math.floor((ahora.getTime() - p.creadoEn.getTime()) / 60_000)} min sin rider`,
          ruta: `/kioscos/${p.kioscoId}`,
        })),
      ],
    };
  }

  /** MAIN: pedidos de la jornada de las zonas elegidas. */
  @Get('pedidos-jornada')
  async pedidosJornada(@Query('zonas') zonas?: string) {
    const nombres = await this.nombresRiders();
    const ps = await this.pedidos.buscar({ creadoEn: { gte: inicioDelDia(new Date()) }, zona: { in: zonasDe(zonas) } });
    return ps.map((p) => filaMain(p, p.riderId ? nombres.get(p.riderId) : undefined));
  }

  @Get('ganancias')
  async ganancias(@Query('periodo') periodo?: string) {
    const p = periodoDe(periodo, PERIODOS_ADMIN);
    const ahora = new Date();
    const pedidos = await this.pedidos.buscar({ estado: EstadoPedido.ENTREGADO, creadoEn: { gte: rangoPeriodo(p, ahora).desde } });
    return gananciasAdmin(pedidos, p, ahora);
  }

  @Get('entregas')
  async entregas(@Query('periodo') periodo?: string, @Query('zonas') zonas?: string) {
    const { desde, hasta } = rangoPeriodo(periodoDe(periodo, PERIODOS_ADMIN), new Date());
    const nombres = await this.nombresRiders();
    const ps = await this.pedidos.buscar({ estado: EstadoPedido.ENTREGADO, zona: { in: zonasDe(zonas) }, creadoEn: { gte: desde, lt: hasta } });
    return ps.map((p) => entregaAdmin(p, p.riderId ? nombres.get(p.riderId) : undefined));
  }
}
