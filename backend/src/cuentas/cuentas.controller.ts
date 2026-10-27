import { Controller, Get, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { EstadoCuenta, Rol } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { Roles } from '../auth/sesion.js';

/** Altas de kioscos y riders: se registran solos y el dueño las aprueba desde FreeDeli Dev. */
@Roles(Rol.DEV)
@Controller('cuentas')
export class CuentasController {
  constructor(private readonly db: PrismaService) {}

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
    return this.cambiarEstado(id, EstadoCuenta.APROBADA);
  }

  @Post(':id/rechazar') @HttpCode(200)
  rechazar(@Param('id', ParseUUIDPipe) id: string) {
    return this.cambiarEstado(id, EstadoCuenta.RECHAZADA);
  }
}
