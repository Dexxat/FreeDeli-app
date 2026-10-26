import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { inject } from 'vitest';

/** Crea la app de Nest contra la base de test. */
export async function crearApp(): Promise<INestApplication> {
  process.env.DATABASE_URL = inject('databaseUrl');
  process.env.JWT_SECRET = 'secreto-de-test';
  process.env.DEV_EMAIL = 'dev@test.local';
  process.env.DEV_CLAVE = 'clave-dev-123';
  const { AppModule } = await import('../src/app.module.js');
  const { configurarApp } = await import('../src/configurar.js');
  const modulo = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = modulo.createNestApplication();
  configurarApp(app);
  await app.init();
  return app;
}
