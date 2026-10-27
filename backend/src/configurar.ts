import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';

const ORIGENES_DEV = 'http://localhost:4300,http://localhost:4301,http://localhost:4302,http://localhost:4303';

/** Configuración común a la app y a los tests e2e. */
export function configurarApp(app: NestExpressApplication): void {
  app.setGlobalPrefix('api');
  // El alta de riders trae dos fotos comprimidas (hasta 2 MB cada una, en base64).
  app.useBodyParser('json', { limit: '6mb' });
  app.enableCors({ origin: (process.env.CORS_ORIGENES ?? ORIGENES_DEV).split(',') });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
