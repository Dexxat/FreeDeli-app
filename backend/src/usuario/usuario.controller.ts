import { Body, Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { BusquedaKioscosDto, DireccionDto } from './dto.js';
import { DatosPersonalesDto } from '../auth/dto.js';
import { CuentasService } from '../cuentas/cuentas.service.js';
import { Roles, SesionActual, type Sesion } from '../auth/sesion.js';
import { Perfiles } from '../comun/perfiles.js';
import { ReglasConfig } from '../comun/reglas.config.js';
import { zonaApi, zonaDb } from '../comun/zonas.js';
import { aceptarAjuste, cancelarPorCliente, seguirEsperandoRider, costoEnvio, distanciaKm, envioCliente, normalizarDni, puedeRecibirPedidos, type Ubicacion } from '../dominio.js';
import { EstadoCuenta, EstadoPedido, Rol } from '../generated/prisma/enums.js';
import { PedidosService } from '../pedidos/pedidos.service.js';
import { NuevoPedidoDto, UbicacionDto } from '../pedidos/dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** App de Usuarios: kioscos, pedido y seguimiento. */
@Roles(Rol.USUARIO)
@Controller()
export class UsuarioController {
  constructor(
    private readonly db: PrismaService,
    private readonly perfiles: Perfiles,
    private readonly cuentas: CuentasService,
    private readonly pedidos: PedidosService,
    private readonly reglas: ReglasConfig,
  ) {}

  @Get('usuario/perfil')
  async perfil(@SesionActual() s: Sesion) {
    const u = await this.db.usuario.findUniqueOrThrow({ where: { cuentaId: s.sub }, include: { cuenta: { select: { email: true } } } });
    return {
      id: u.id,
      nombre: u.nombre,
      dni: u.dni ?? '',
      telefono: u.telefono,
      estrellas: u.estrellas,
      saldoFavor: u.saldoFavor,
      pausado: u.pausado,
      email: u.cuenta.email,
      direccion: { direccion: u.direccion, notas: u.notas ?? undefined, zona: zonaApi(u.zona) },
    };
  }

  @Patch('usuario/datos')
  async cambiarDatos(@SesionActual() s: Sesion, @Body() dto: DatosPersonalesDto) {
    await this.cuentas.cambiarEmail(s.sub, dto.email);
    await this.db.usuario.update({
      where: { cuentaId: s.sub },
      data: { nombre: dto.nombre.trim().replace(/\s+/g, ' '), dni: normalizarDni(dto.dni), telefono: dto.telefono.trim() },
    });
    return this.perfil(s);
  }

  @Patch('usuario/direccion')
  async cambiarDireccion(@SesionActual() s: Sesion, @Body() dto: DireccionDto) {
    await this.db.usuario.update({
      where: { cuentaId: s.sub },
      data: { direccion: dto.direccion.trim(), notas: dto.notas?.trim() || null, zona: zonaDb(dto.zona) },
    });
    return this.perfil(s);
  }

  /** Kioscos que reciben pedidos, con distancia y envío hasta el GPS del cliente. */
  @Get('kioscos')
  async kioscos(@Query() q: BusquedaKioscosDto) {
    const zona = q.zona ? zonaDb(q.zona) : undefined;
    const kioscos = await this.db.kiosco.findMany({ where: { cuenta: { estado: EstadoCuenta.APROBADA }, zona }, orderBy: { nombre: 'asc' } });
    return kioscos.filter((k) => puedeRecibirPedidos(k)).map((k) => this.paraUsuario(k, q));
  }

  @Get('kioscos/:id')
  async kiosco(@Param('id', ParseUUIDPipe) id: string, @Query() desde: UbicacionDto) {
    const k = await this.db.kiosco.findFirst({ where: { id, cuenta: { estado: EstadoCuenta.APROBADA } } });
    if (!k) throw new NotFoundException('No encontramos el kiosco.');
    return this.paraUsuario(k, desde);
  }

  @Get('kioscos/:id/productos')
  productos(@Param('id', ParseUUIDPipe) id: string) {
    return this.db.producto.findMany({ where: { kioscoId: id, disponible: true }, orderBy: { nombre: 'asc' } });
  }

  private paraUsuario(k: { id: string; nombre: string; zona: Parameters<typeof zonaApi>[0]; direccion: string; lat: number; lng: number; pausado: boolean; saldo: number; tiempoEstimadoMin: number }, desde: Ubicacion) {
    const km = distanciaKm({ lat: k.lat, lng: k.lng }, desde);
    return {
      id: k.id,
      nombre: k.nombre,
      zona: zonaApi(k.zona),
      direccion: k.direccion,
      ubicacion: { lat: k.lat, lng: k.lng },
      recibePedidos: puedeRecibirPedidos(k),
      pausado: k.pausado,
      tiempoEstimadoMin: k.tiempoEstimadoMin,
      distanciaKm: km,
      // Lo que paga el usuario: el costo del viaje hasta el tope.
      costoEnvio: envioCliente(costoEnvio(km, this.reglas.tarifaEnvio)),
    };
  }

  @Post('pedidos')
  async crear(@SesionActual() s: Sesion, @Body() dto: NuevoPedidoDto) {
    return this.pedidos.crear(await this.perfiles.usuarioId(s.sub), dto);
  }

  @Get('pedidos/en-curso')
  async enCurso(@SesionActual() s: Sesion) {
    const usuarioId = await this.perfiles.usuarioId(s.sub);
    const [p] = await this.pedidos.buscar({ usuarioId, estado: { in: this.pedidos.abiertos() } }, 'desc', 1);
    return p ?? null;
  }

  /** Último pedido entregado en cada kiosco, para "Pedí de nuevo". */
  @Get('pedidos/recientes')
  async recientes(@SesionActual() s: Sesion) {
    const usuarioId = await this.perfiles.usuarioId(s.sub);
    const entregados = await this.pedidos.buscar({ usuarioId, estado: EstadoPedido.ENTREGADO }, 'desc', 30);
    const vistos = new Set<string>();
    return entregados.filter((p) => !vistos.has(p.kioscoId) && vistos.add(p.kioscoId)).slice(0, 3);
  }

  @Get('pedidos/:id')
  async pedido(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    return this.pedidos.uno({ id, usuarioId: await this.perfiles.usuarioId(s.sub) });
  }

  @Get('pedidos/:id/rider')
  async rider(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    const p = await this.pedidos.uno({ id, usuarioId: await this.perfiles.usuarioId(s.sub) });
    if (!p.riderId) return null;
    const r = await this.db.rider.findUniqueOrThrow({ where: { id: p.riderId } });
    const [nombre, apellido] = r.nombre.split(' ');
    return { nombre: apellido ? `${nombre} ${apellido[0]}.` : nombre, vehiculo: r.vehiculoModelo, patente: r.patente };
  }

  @Post('pedidos/:id/aceptar-ajuste') @HttpCode(200)
  async aceptarAjuste(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    const usuarioId = await this.perfiles.usuarioId(s.sub);
    return this.pedidos.transicionar(id, (f) => f.usuarioId === usuarioId, aceptarAjuste);
  }

  @Post('pedidos/:id/cancelar') @HttpCode(200)
  async cancelar(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    const usuarioId = await this.perfiles.usuarioId(s.sub);
    // Si el GPS del rider dice que pasó la mitad del viaje, cobra el envío (ver cancelarPorCliente).
    return this.pedidos.transicionar(id, (f) => f.usuarioId === usuarioId, (p) => cancelarPorCliente(p, new Date()));
  }

  /** Pasados 10 minutos sin rider, el cliente elige seguir esperando. */
  @Post('pedidos/:id/seguir-esperando') @HttpCode(200)
  async seguirEsperando(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    const usuarioId = await this.perfiles.usuarioId(s.sub);
    return this.pedidos.transicionar(id, (f) => f.usuarioId === usuarioId, (p) => seguirEsperandoRider(p, new Date()));
  }

  /** FREEDELI RUSH: jugó 10 minutos seguidos mientras el rider estaba en camino. */
  @Post('pedidos/:id/estrella') @HttpCode(200)
  async estrella(@SesionActual() s: Sesion, @Param('id', ParseUUIDPipe) id: string) {
    return this.pedidos.sumarEstrella(await this.perfiles.usuarioId(s.sub), id);
  }
}
