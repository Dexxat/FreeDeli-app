import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

/** De la cuenta con sesión a su perfil (usuario, kiosco o rider). */
@Injectable()
export class Perfiles {
  constructor(private readonly db: PrismaService) {}

  async usuarioId(cuentaId: string): Promise<string> {
    const u = await this.db.usuario.findUnique({ where: { cuentaId }, select: { id: true } });
    if (!u) throw new ForbiddenException('La cuenta no es de un usuario.');
    return u.id;
  }

  async kioscoId(cuentaId: string): Promise<string> {
    const k = await this.db.kiosco.findUnique({ where: { cuentaId }, select: { id: true } });
    if (!k) throw new ForbiddenException('La cuenta no es de un kiosco.');
    return k.id;
  }

  async riderId(cuentaId: string): Promise<string> {
    const r = await this.db.rider.findUnique({ where: { cuentaId }, select: { id: true } });
    if (!r) throw new ForbiddenException('La cuenta no es de un rider.');
    return r.id;
  }
}
