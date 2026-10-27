import { ConflictException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/** Datos de la cuenta (login) que comparten usuarios, kioscos y riders. */
@Injectable()
export class CuentasService {
  constructor(private readonly db: PrismaService) {}

  /** Cambia el email de ingreso. Falla si ya es de otra cuenta. */
  async cambiarEmail(cuentaId: string, email: string): Promise<void> {
    const nuevo = email.trim().toLowerCase();
    const duena = await this.db.cuenta.findUnique({ where: { email: nuevo }, select: { id: true } });
    if (duena && duena.id !== cuentaId) throw new ConflictException('Ya hay una cuenta con ese email.');
    if (!duena) await this.db.cuenta.update({ where: { id: cuentaId }, data: { email: nuevo } });
  }
}
