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

## Pedido

Cada cambio de estado usa las mismas reglas que las apps (`projects/shared/src/lib/rules/flujo.rules.ts`) y se aplica con la fila del pedido bloqueada, así dos acciones simultáneas no se pisan.

| Método | Ruta | Quién | Qué hace |
|---|---|---|---|
| GET | `/api/kioscos?zona=` | Usuario | Kioscos que reciben pedidos, con distancia y envío |
| GET | `/api/kioscos/:id/productos` | Usuario | Catálogo disponible |
| POST | `/api/pedidos` | Usuario | Crea el pedido (mínimo $15.000, uno a la vez) |
| GET | `/api/pedidos/en-curso` · `/recientes` · `/:id` · `/:id/rider` | Usuario | Seguimiento |
| POST | `/api/pedidos/:id/aceptar-ajuste` · `/cancelar` | Usuario | Respuesta al ajuste de stock |
| GET | `/api/kiosco` · `/pedidos/en-vivo` | Kiosco | Perfil y tablero |
| POST | `/api/kiosco/pedidos/:id/stock` · `/transferencia` · `/aprobar-rider` · `/envio` | Kiosco | Pasos del kiosco |
| GET · POST · PATCH | `/api/kiosco/productos` | Kiosco | Catálogo |
| PATCH | `/api/rider/estado` | Rider | ON/OFF y zonas |
| GET | `/api/rider/oferta` · `/pedido` | Rider | Oferta vigente y pedido en curso |
| POST | `/api/rider/ofertas/:pedidoId/aceptar` · `/rechazar` | Rider | Responder la oferta |
| POST | `/api/rider/pedidos/:id/retiro` · `/en-camino` · `/entregar` | Rider | Pasos del rider; entregar pide el PIN |
| GET | `/api/eventos?token=` | Todos | Tiempo real (Server-Sent Events): cada cuenta recibe solo lo suyo |

## Perfiles y reportes

| Método | Ruta | Quién |
|---|---|---|
| GET · PATCH | `/api/usuario/perfil` · `/api/usuario/direccion` | Usuario |
| GET | `/api/kiosco/historial` · `/ganancias` · `/saldo`; PATCH `/api/kiosco/datos` | Kiosco |
| GET | `/api/rider` · `/historial` · `/ganancias` · `/demanda`; PATCH `/api/rider/perfil` | Rider |
| GET | `/api/admin/resumen` · `/pedidos-jornada?zonas=` · `/ganancias` · `/entregas` | Dev |
| GET | `/api/admin/kioscos` · `/kioscos/:id` · `/movimientos` · `/saldo`; POST `/saldo` · `/pausa` | Dev |
| GET | `/api/admin/riders/:id` · `/envios`; POST `/pausa` | Dev |
| GET · POST · PATCH | `/api/admin/conflictos` | Dev |

Los períodos (`?periodo=`) son `hoy`/`semana`/`mes` en historiales, `jornada`/`semana`/`mes` en ganancias de kiosco y Dev, y `jornada`/`semana`/`mes-pasado` en las del rider. Los cálculos de ganancias y entregas son las mismas reglas que usan las apps (`rules/reportes.rules.ts`). Las horas online del rider salen de sus tramos ON/OFF.

Los días se cuentan en la hora local del servidor: correrlo con `TZ=America/Argentina/Buenos_Aires`.

Las ofertas se dan a un rider por vez, al que hace más tiempo que no recibe una, con 30 segundos para responder. Si vence o la rechaza, pasa al siguiente.

Variables opcionales: `COMISION_PORCENTAJE` (10), `TARIFA_CERCA` (3000), `TARIFA_MEDIA` (4000), `TARIFA_LEJOS` (5000), `ALIAS_FREEDELI`, `SEGUNDOS_OFERTA` (30), `DESPACHO_AUTOMATICO` (true), `HORARIO_LIBRE` (false: solo se pide de 00 a 08 hs; true para desarrollo y pruebas).

## Producción

`docker-compose.yml` levanta Postgres. Definir `DATABASE_URL`, `JWT_SECRET`, `DEV_EMAIL`, `DEV_CLAVE` y `CORS_ORIGENES` como variables de entorno.
