import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Publico } from './auth/sesion.js';
import { PrismaService } from './prisma/prisma.service.js';

/** Para el healthcheck del contenedor y el monitoreo. */
@Controller('salud')
export class SaludController {
  constructor(private readonly db: PrismaService) {}

  @Publico()
  @Get()
  async salud() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { ok: true };
    } catch {
      throw new ServiceUnavailableException({ ok: false, message: 'Sin conexión con la base de datos.' });
    }
  }
}
