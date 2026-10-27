// Levanta un Postgres embebido descartable para los tests e2e y aplica las migraciones.
import EmbeddedPostgres from 'embedded-postgres';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { TestProject } from 'vitest/node';

function puertoLibre(): Promise<number> {
  return new Promise((ok) => {
    const s = createServer().listen(0, () => {
      const puerto = (s.address() as { port: number }).port;
      s.close(() => ok(puerto));
    });
  });
}

export default async function setup(project: TestProject) {
  // En CI se usa un Postgres de servicio (TEST_DATABASE_URL); en la Mac, uno embebido y descartable.
  const externa = process.env.TEST_DATABASE_URL;
  if (externa) {
    execFileSync('npx', ['prisma', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: externa }, stdio: 'pipe' });
    project.provide('databaseUrl', externa);
    return async () => {};
  }
  const dir = mkdtempSync(join(tmpdir(), 'freedeli-pg-'));
  const port = await puertoLibre();
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'test', password: 'test', port, persistent: false, onLog: () => {}, onError: () => {} });
  await pg.initialise();
  await pg.start();
  await pg.createDatabase('freedeli_test');
  const url = `postgresql://test:test@localhost:${port}/freedeli_test`;
  execFileSync('npx', ['prisma', 'migrate', 'deploy'], { env: { ...process.env, DATABASE_URL: url }, stdio: 'pipe' });
  project.provide('databaseUrl', url);
  return async () => {
    await pg.stop();
    rmSync(dir, { recursive: true, force: true });
  };
}

declare module 'vitest' {
  export interface ProvidedContext {
    databaseUrl: string;
  }
}
