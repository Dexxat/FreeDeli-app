import { ValidationPipe, type INestApplication } from '@nestjs/common';

const ORIGENES_DEV = 'http://localhost:4300,http://localhost:4301,http://localhost:4302,http://localhost:4303';

/** Configuración común a la app y a los tests e2e. */
export function configurarApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.enableCors({ origin: (process.env.CORS_ORIGENES ?? ORIGENES_DEV).split(',') });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
}
