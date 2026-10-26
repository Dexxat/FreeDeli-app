import { Body, Controller, ForbiddenException, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Roles, SesionActual, type Sesion } from '../auth/sesion.js';
import { Perfiles } from '../comun/perfiles.js';
import { zonaApi, zonaDb } from '../comun/zonas.js';
import { confirmarRetiro, entregarConPin, salirEnCamino } from '../dominio.js';
import { EstadoPedido, FasePedido, Rol } from '../generated/prisma/enums.js';
import { DespachoService } from '../pedidos/despacho.service.js';
import { EstadoRiderDto, PinDto } from '../pedidos/dto.js';
import { PedidosService } from '../pedidos/pedidos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** App de Riders: disponibilidad, ofertas y entrega. */
@Roles(Rol.RIDER)
@Controller('rider')
export class RiderController {
  constructor(
    private readonly db: PrismaService,
    private readonly perfiles: Perfiles,
    private readonly pedidos: PedidosService,
    private readonly despacho: DespachoService,
  ) {}

  @Get()
  async perfil(@SesionActual() s: Sesion) {
    const r = await this.db.rider.findUniqueOrThrow({ where: { cuentaId: s.sub } });
    return { ...r, zonas: r.zonas.map(zonaApi), vehiculo: { modelo: r.vehiculoModelo, patente: r.patente }, cobro: { aliasCbu: r.aliasCbu } };
  }

  /** Interruptor ON/OFF y zonas. */
  @Patch('estado')
  async estado(@SesionActual() s: Sesion, @Body() dto: EstadoRiderDto) {
    const r = await this.db.rider.findUniqueOrThrow({ where: { cuentaId: s.sub } });
    if (dto.disponible && r.pausado) throw new ForbiddenException('Tu cuenta está pausada. Escribinos por WhatsApp.');
    const zonas = dto.zonas ?? r.zonas.map(zonaApi);
    if (dto.disponible && zonas.length === 0) throw new ForbiddenException('Elegí al menos una zona.');
    const act = await this.db.rider.update({ where: { id: r.id }, data: { disponible: dto.disponible, zonas: dto.zonas?.map(zonaDb) } });
    if (act.disponible) await this.despacho.barrer();
    return { disponible: act.disponible, zonas: act.zonas.map(zonaApi), pausado: act.pausado };
  }

  @Get('oferta')
  async oferta(@SesionActual() s: Sesion) {
    return this.despacho.ofertaActual(await this.perfiles.riderId(s.sub));
  }

  @Post('ofertas/:pedidoId/aceptar') @HttpCode(200)
  async aceptar(@SesionActual() s: Sesion, @Param('pedidoId', ParseUUIDPipe) pedidoId: string) {
    return this.despacho.aceptar(await this.perfiles.riderId(s.sub), pedidoId);
  }

  @Post('ofertas/:pedidoId/rechazar') @HttpCode(200)
  async rechazar(@SesionActual() s: Sesion, @Param('pedidoId', ParseUUIDPipe) pedidoId: string) {
    await this.despacho.rechazar(await this.perfiles.riderId(s.sub), pedidoId);
    return { ok: true };
  }

  /** Pedido del rider: esperando la aprobación del kiosco o en curso. */
  @Get('pedido')
  async enCurso(@SesionActual() s: Sesion) {
    const riderId = await this.perfiles.riderId(s.sub);
    const [p] = await this.pedidos.buscar(
      {
        riderId,
        OR: [
          { estado: { in: [EstadoPedido.ACEPTADO, EstadoPedido.RETIRADO, EstadoPedido.EN_CAMINO] } },
          { estado: EstadoPedido.ESPERANDO, fase: FasePedido.APROBACION },
        ],
      },
      'desc',
      1,
    );
    return p ?? null;
  }

  private async propio(s: Sesion) {
    const riderId = await this.perfiles.riderId(s.sub);
    return (f: { riderId: string | null }) => f.riderId === riderId;
  }

  @Post('pedidos/:id/retiro') @HttpCode(200)
  async retiro(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    return this.pedidos.transicionar(id, await this.propio(s), (p) => confirmarRetiro(p, 'rider', new Date()));
  }

  @Post('pedidos/:id/en-camino') @HttpCode(200)
  async enCamino(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    return this.pedidos.transicionar(id, await this.propio(s), salirEnCamino);
  }

  /** Con el PIN correcto se entrega, se libera el pago y se descuenta la comisión del saldo del kiosco. */
  @Post('pedidos/:id/entregar') @HttpCode(200)
  async entregar(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string, @Body() dto: PinDto) {
    return this.pedidos.transicionar(id, await this.propio(s), (p) => entregarConPin(p, dto.pin, new Date()), (tx, p) => this.pedidos.descontarComision(tx, p));
  }
}
