// Levanta Postgres embebido para desarrollo, sin Docker ni instalación del sistema.
// Uso: npm run db   (queda corriendo; Ctrl+C para cerrarlo)
import EmbeddedPostgres from 'embedded-postgres';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dir = fileURLToPath(new URL('../.pgdata', import.meta.url));
const pg = new EmbeddedPostgres({ databaseDir: dir, user: 'freedeli', password: 'freedeli', port: 5433, persistent: true, onLog: () => {} });

const nuevo = !existsSync(dir);
if (nuevo) await pg.initialise();
await pg.start();
if (nuevo) await pg.createDatabase('freedeli');
console.log('Postgres listo en postgresql://freedeli:freedeli@localhost:5433/freedeli');

const cerrar = async () => {
  await pg.stop();
  process.exit(0);
};
process.on('SIGINT', cerrar);
process.on('SIGTERM', cerrar);
