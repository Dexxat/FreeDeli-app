import { Body, Controller, HttpCode, NotFoundException, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { Roles } from '../auth/sesion.js';
import { Rol, TipoMovimientoSaldo } from '../generated/prisma/enums.js';
import { CargaSaldoDto } from '../pedidos/dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

/** FreeDeli Dev. */
@Roles(Rol.DEV)
@Controller('admin')
export class AdminController {
  constructor(private readonly db: PrismaService) {}

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
}
