# FreeDeli · API

API de FreeDeli con NestJS y Postgres (Prisma). La usan las cuatro apps: Usuarios, Kioscos, Riders y Dev.

## Desarrollo

No hace falta Docker: `npm run db` levanta un Postgres embebido en el puerto 5433 y guarda los datos en `.pgdata/`.

```bash
cp .env.example .env      # la primera vez
npm install
npm run db                # en una terminal aparte; queda corriendo
npx prisma migrate deploy # aplica las migraciones
npm run start:dev         # API en http://localhost:3000/api
```

Al iniciar se crea la cuenta del dueño con `DEV_EMAIL` y `DEV_CLAVE` si todavía no existe.

## Tests

```bash
npm test          # unitarios
npm run test:e2e  # contra un Postgres embebido descartable
```

## Cuentas y acceso

- Los usuarios se registran y quedan aprobados.
- Kioscos y riders se registran y quedan pendientes hasta que el dueño los aprueba desde Dev.
- Una cuenta pendiente puede iniciar sesión y consultar `GET /api/auth/yo`, pero no operar.
- Las contraseñas se guardan con scrypt. La sesión es un token JWT de 30 días.

| Método | Ruta | Quién |
|---|---|---|
| POST | `/api/auth/registro/usuario` | Público |
| POST | `/api/auth/registro/kiosco` | Público, queda pendiente |
| POST | `/api/auth/registro/rider` | Público, queda pendiente |
| POST | `/api/auth/ingresar` | Público |
| GET | `/api/auth/yo` | Con sesión, aunque esté pendiente |
| GET | `/api/cuentas/pendientes` | Dev |
| POST | `/api/cuentas/:id/aprobar` · `/rechazar` | Dev |

## Producción

`docker-compose.yml` levanta Postgres. Definir `DATABASE_URL`, `JWT_SECRET`, `DEV_EMAIL`, `DEV_CLAVE` y `CORS_ORIGENES` como variables de entorno.
