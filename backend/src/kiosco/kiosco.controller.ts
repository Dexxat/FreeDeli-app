import { Body, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { PERIODOS_ADMIN, PERIODOS_HISTORIAL, periodoDe } from '../comun/consultas.js';
import { Roles, SesionActual, type Sesion } from '../auth/sesion.js';
import { Perfiles } from '../comun/perfiles.js';
import { ReglasConfig } from '../comun/reglas.config.js';
import { zonaApi } from '../comun/zonas.js';
import { aprobarRider, confirmarRetiro, confirmarStock, confirmarTransferencia, gananciasKiosco, marcarReintegrado, rangoPeriodo } from '../dominio.js';
import { EstadoPedido, Rol } from '../generated/prisma/enums.js';
import { geolocalizar } from '../comun/zonas.js';
import { AprobarRiderDto, CambiosProductoDto, DatosKioscoDto, ProductoDto, StockDto } from '../pedidos/dto.js';
import { PedidosService } from '../pedidos/pedidos.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AvisosRiderService } from '../avisos/avisos-rider.service.js';

/** App de Kioscos: pedidos en vivo, flujo y catálogo. */
@Roles(Rol.KIOSCO)
@Controller('kiosco')
export class KioscoController {
  constructor(
    private readonly db: PrismaService,
    private readonly perfiles: Perfiles,
    private readonly pedidos: PedidosService,
    private readonly reglas: ReglasConfig,
    private readonly avisos: AvisosRiderService,
  ) {}

  @Get()
  async perfil(@SesionActual() s: Sesion) {
    const k = await this.db.kiosco.findUniqueOrThrow({ where: { cuentaId: s.sub } });
    return { ...k, zona: zonaApi(k.zona), ubicacion: { lat: k.lat, lng: k.lng }, costoEnvio: 0, aliasFreeDeli: this.reglas.aliasFreeDeli };
  }

  /** Pedidos abiertos y cancelados con dinero por devolver al cliente. */
  @Get('pedidos/en-vivo')
  async enVivo(@SesionActual() s: Sesion) {
    return this.pedidos.buscar(
      {
        kioscoId: await this.perfiles.kioscoId(s.sub),
        OR: [{ estado: { in: this.pedidos.abiertos() } }, { estado: EstadoPedido.CANCELADO, reintegro: { gt: 0 }, reintegradoEn: null }],
      },
      'asc',
    );
  }

  private async propio(s: Sesion) {
    const kioscoId = await this.perfiles.kioscoId(s.sub);
    return (f: { kioscoId: string }) => f.kioscoId === kioscoId;
  }

  @Post('pedidos/:id/stock') @HttpCode(200)
  async stock(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string, @Body() dto: StockDto) {
    return this.pedidos.transicionar(id, await this.propio(s), (p) => confirmarStock(p, dto.faltantes, this.reglas.comisionPorcentaje));
  }

  @Post('pedidos/:id/transferencia') @HttpCode(200)
  async transferencia(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    return this.pedidos.transicionar(id, await this.propio(s), (p) => confirmarTransferencia(p, new Date()));
  }

  @Post('pedidos/:id/aprobar-rider') @HttpCode(200)
  async aprobarRider(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string, @Body() dto: AprobarRiderDto) {
    const p = await this.pedidos.transicionar(id, await this.propio(s), (x) => aprobarRider(x, dto.aprobado, new Date()));
    if (dto.aprobado) this.avisos.pedidoAprobado(p.riderId!, p);
    else this.avisos.pedidoRechazado(p.ridersRechazados!.at(-1)!, p);
    return p;
  }

  /** "Confirmar envío": el kiosco le entregó el pedido al rider. */
  @Post('pedidos/:id/envio') @HttpCode(200)
  async envio(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    return this.pedidos.transicionar(id, await this.propio(s), (p) => confirmarRetiro(p, 'kiosco', new Date()));
  }

  /** El kiosco le devolvió al cliente el dinero de un pedido cancelado. */
  @Post('pedidos/:id/reintegro') @HttpCode(200)
  async reintegro(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    return this.pedidos.transicionar(id, await this.propio(s), (p) => marcarReintegrado(p, new Date()));
  }

  /** Pedidos terminados del período, del más nuevo al más viejo. */
  @Get('historial')
  async historial(@SesionActual() s: Sesion, @Query('periodo') periodo?: string) {
    const { desde, hasta } = rangoPeriodo(periodoDe(periodo, PERIODOS_HISTORIAL), new Date());
    return this.pedidos.buscar({
      kioscoId: await this.perfiles.kioscoId(s.sub),
      estado: { in: [EstadoPedido.ENTREGADO, EstadoPedido.CANCELADO] },
      creadoEn: { gte: desde, lt: hasta },
    });
  }

  @Get('ganancias')
  async ganancias(@SesionActual() s: Sesion, @Query('periodo') periodo?: string) {
    const p = periodoDe(periodo, PERIODOS_ADMIN);
    const ahora = new Date();
    const { desde } = rangoPeriodo(p, ahora);
    const pedidos = await this.pedidos.buscar({ kioscoId: await this.perfiles.kioscoId(s.sub), estado: EstadoPedido.ENTREGADO, creadoEn: { gte: desde } });
    return gananciasKiosco(pedidos, p, ahora);
  }

  /** Cargas y comisiones del saldo prepago. */
  @Get('saldo')
  async saldo(@SesionActual() s: Sesion) {
    return this.db.movimientoSaldo.findMany({ where: { kioscoId: await this.perfiles.kioscoId(s.sub) }, orderBy: { fecha: 'desc' }, take: 200 });
  }

  @Patch('datos')
  async datos(@SesionActual() s: Sesion, @Body() dto: DatosKioscoDto) {
    const k = await this.db.kiosco.findUniqueOrThrow({ where: { cuentaId: s.sub } });
    const direccion = dto.direccion.trim();
    const ubic = direccion === k.direccion ? { lat: k.lat, lng: k.lng } : geolocalizar(direccion, zonaApi(k.zona));
    await this.db.kiosco.update({ where: { id: k.id }, data: { nombre: dto.nombre.trim(), direccion, aliasCobro: dto.aliasCobro, tiempoEstimadoMin: dto.tiempoEstimadoMin, ...ubic } });
    return this.perfil(s);
  }

  @Get('riders/:id')
  async rider(@Param('id', ParseUUIDPipe) id: string) {
    const r = await this.db.rider.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('No existe ese rider.');
    return { nombre: r.nombre, vehiculo: r.vehiculoModelo, patente: r.patente };
  }

  @Get('productos')
  async catalogo(@SesionActual() s: Sesion) {
    return this.db.producto.findMany({ where: { kioscoId: await this.perfiles.kioscoId(s.sub) }, orderBy: { nombre: 'asc' } });
  }

  @Post('productos')
  async crearProducto(@SesionActual() s: Sesion, @Body() dto: ProductoDto) {
    return this.db.producto.create({ data: { kioscoId: await this.perfiles.kioscoId(s.sub), nombre: dto.nombre.trim(), precio: dto.precio, disponible: dto.disponible ?? true } });
  }

  @Patch('productos/:id')
  async editarProducto(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string, @Body() dto: CambiosProductoDto) {
    const kioscoId = await this.perfiles.kioscoId(s.sub);
    const r = await this.db.producto.updateMany({ where: { id, kioscoId }, data: { nombre: dto.nombre?.trim(), precio: dto.precio, disponible: dto.disponible } });
    if (r.count === 0) throw new NotFoundException('No encontramos el producto.');
    return this.db.producto.findUniqueOrThrow({ where: { id } });
  }
}
