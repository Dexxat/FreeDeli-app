// Entorno completo para las pruebas end to end, parecido a producción:
//   Postgres (embebido y descartable, o el de DATABASE_URL en CI) → API compilada → las cuatro apps
//   compiladas para producción, cada una servida como lo hace Caddy (archivos + /api al backend).
// Lo arranca Playwright (webServer). E2E_SIN_BUILD=1 saltea las compilaciones si ya están hechas.
import { execFileSync, spawn } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { createServer, request } from 'node:http';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APPS, PUERTO_API, PUERTO_PG, DEV } from './config.mjs';

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const BACKEND = join(RAIZ, 'backend');
const ESTADO = fileURLToPath(new URL('../.entorno/', import.meta.url));
const log = (...a) => console.log('[entorno]', ...a);
const correr = (cmd, args, cwd, env = {}) => execFileSync(cmd, args, { cwd, stdio: 'inherit', env: { ...process.env, ...env } });

const limpiezas = [];
async function cerrar(codigo = 0) {
  for (const f of limpiezas.reverse()) await f().catch(() => {});
  process.exit(codigo);
}
process.on('SIGINT', () => cerrar());
process.on('SIGTERM', () => cerrar());

try {
  // 1. Compilar.
  if (!process.env.E2E_SIN_BUILD) {
    for (const app of APPS) {
      log('compilando', app.proyecto);
      correr('npx', ['ng', 'build', app.proyecto], RAIZ);
    }
    log('compilando la API');
    correr('npm', ['run', 'build'], BACKEND);
  }

  // 2. Base de datos.
  rmSync(ESTADO, { recursive: true, force: true });
  mkdirSync(ESTADO, { recursive: true });
  let url = process.env.DATABASE_URL;
  if (!url) {
    const { default: EmbeddedPostgres } = await import('embedded-postgres');
    const pg = new EmbeddedPostgres({ databaseDir: join(ESTADO, 'pg'), user: 'e2e', password: 'e2e', port: PUERTO_PG, persistent: false, onLog: () => {}, onError: () => {} });
    await pg.initialise();
    await pg.start();
    await pg.createDatabase('freedeli_e2e');
    limpiezas.push(() => pg.stop());
    url = `postgresql://e2e:e2e@localhost:${PUERTO_PG}/freedeli_e2e`;
  }
  writeFileSync(join(ESTADO, 'db-url'), url);
  log('migrando', url.replace(/:[^:@/]+@/, ':***@'));
  correr('npx', ['prisma', 'migrate', 'deploy'], BACKEND, { DATABASE_URL: url });

  // 3. API.
  const api = spawn('node', ['dist/backend/src/main.js'], {
    cwd: BACKEND,
    stdio: ['ignore', 'inherit', 'inherit'],
    env: {
      ...process.env,
      DATABASE_URL: url,
      PORT: String(PUERTO_API),
      JWT_SECRET: 'secreto-e2e',
      DEV_EMAIL: DEV.email,
      DEV_CLAVE: DEV.clave,
      HORARIO_LIBRE: 'true',
      SEGUNDOS_OFERTA: '15',
      CORS_ORIGENES: APPS.map((a) => `http://localhost:${a.puerto}`).join(','),
    },
  });
  api.on('exit', (c) => {
    log('la API terminó con código', c);
    cerrar(1);
  });
  limpiezas.push(async () => {
    api.removeAllListeners('exit');
    api.kill('SIGTERM');
  });

  // 4. Apps: archivos compilados con fallback a index.html y /api al backend sin buffer (SSE).
  const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain' };
  for (const app of APPS) {
    const raiz = join(RAIZ, 'dist', app.proyecto, 'browser');
    if (!existsSync(join(raiz, 'index.html'))) throw new Error(`Falta compilar ${app.proyecto} (${raiz})`);
    const servidor = createServer((req, res) => {
      if (req.url.startsWith('/api/') || req.url === '/api') {
        const p = request({ host: '127.0.0.1', port: PUERTO_API, path: req.url, method: req.method, headers: req.headers }, (r) => {
          res.writeHead(r.statusCode ?? 502, r.headers);
          r.pipe(res);
        });
        p.on('error', () => {
          res.writeHead(502);
          res.end('API no disponible');
        });
        req.pipe(p);
        return;
      }
      let ruta = join(raiz, decodeURIComponent(req.url.split('?')[0]));
      if (!ruta.startsWith(raiz) || !existsSync(ruta) || statSync(ruta).isDirectory()) ruta = join(raiz, 'index.html');
      res.writeHead(200, { 'Content-Type': tipos[extname(ruta)] ?? 'application/octet-stream', 'Cache-Control': 'no-store' });
      createReadStream(ruta).pipe(res);
    });
    await new Promise((ok) => servidor.listen(app.puerto, ok));
    limpiezas.push(() => new Promise((ok) => servidor.close(ok)));
    log(`${app.proyecto} en http://localhost:${app.puerto}`);
  }
  log('listo');
} catch (e) {
  console.error('[entorno] no se pudo levantar:', e);
  await cerrar(1);
}
