import { Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { EstadoCuenta, Rol } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Roles } from '../auth/sesion.js';
import { AvisosRiderService } from '../avisos/avisos-rider.service.js';

/** Altas de kioscos y riders: se registran solos y el dueño las aprueba desde FreeDeli Dev. */
@Roles(Rol.DEV)
@Controller('cuentas')
export class CuentasController {
  constructor(
    private readonly db: PrismaService,
    private readonly avisos: AvisosRiderService,
  ) {}

  @Get('pendientes')
  pendientes() {
    return this.db.cuenta.findMany({
      where: { estado: EstadoCuenta.PENDIENTE },
      orderBy: { creadaEn: 'asc' },
      select: {
        id: true,
        email: true,
        rol: true,
        creadaEn: true,
        kiosco: { select: { nombre: true, direccion: true, zona: true, aliasCobro: true } },
        rider: { select: { id: true, nombre: true, telefono: true, dni: true, vehiculoModelo: true, patente: true } },
      },
    });
  }

  private async cambiarEstado(id: string, estado: EstadoCuenta) {
    const cuenta = await this.db.cuenta.findUnique({ where: { id } });
    if (!cuenta || cuenta.rol === Rol.DEV) throw new NotFoundException('No existe esa cuenta.');
    return this.db.cuenta.update({ where: { id }, data: { estado }, select: { id: true, email: true, rol: true, estado: true } });
  }

  @Post(':id/aprobar') @HttpCode(200)
  aprobar(@Param('id', ParseUUIDPipe) id: string) {
    return this.resolver(id, true);
  }

  @Post(':id/rechazar') @HttpCode(200)
  rechazar(@Param('id', ParseUUIDPipe) id: string) {
    return this.resolver(id, false);
  }

  /** Aprueba o rechaza el alta. A los riders se les avisa por WhatsApp. */
  private async resolver(id: string, aprobada: boolean) {
    const cuenta = await this.cambiarEstado(id, aprobada ? EstadoCuenta.APROBADA : EstadoCuenta.RECHAZADA);
    if (cuenta.rol === Rol.RIDER) this.avisos.alta(cuenta.id, aprobada);
    return cuenta;
  }
}
