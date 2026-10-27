# Pruebas end to end

Prueban FreeDeli como lo usa la gente: las cuatro apps abiertas en el navegador, cada una con su propia sesión, contra la API real y una base Postgres.

## Correrlas

```bash
cd e2e
npm install          # la primera vez
npm test             # compila todo, levanta el entorno y corre las pruebas
npm run reporte      # abre el reporte HTML de la última corrida
```

`npm test` compila las cuatro apps y la API. Para correrlas de nuevo sin compilar:

```bash
E2E_SIN_BUILD=1 npm test
```

Para ver los logs de la API, agregar `E2E_LOGS=1`. Para correr un solo archivo: `npm test -- riders`.

En la Mac se usa el Chrome instalado. En CI se usa el Chromium de Playwright.

## El entorno

`entorno/levantar.mjs` arma algo parecido a producción y lo arranca Playwright solo:

| Pieza | Dónde |
|---|---|
| Postgres | Embebido y descartable, o el de `DATABASE_URL` si está definida (CI) |
| API | `http://localhost:3100`, con el horario nocturno liberado y ofertas de 15 s |
| Usuarios | `http://localhost:4400` |
| Kioscos | `http://localhost:4401` |
| Riders | `http://localhost:4402` |
| Dev | `http://localhost:4403` |

Las apps se sirven compiladas para producción, con `/api` pasado a la API, como hace Caddy.

## Qué cubren

| Archivo | Qué prueba |
|---|---|
| `pedido-completo` | Un pedido de punta a punta con las cuatro apps a la vez, PIN incorrecto y correcto, y el dinero al final |
| `stock` | Falta de stock: el cliente acepta el ajuste o cancela |
| `riders` | Rechazo de oferta sin penalidad, rechazo del kiosco, vencimiento de la oferta |
| `reglas` | Pedido mínimo, un pedido abierto, saldo insuficiente, pausa, área de cobertura, anillos de envío |
| `concurrencia` | Entregas, pedidos y aceptaciones simultáneas |
| `seguridad` | Sesión, roles, cuentas pendientes, pedidos ajenos, validación de datos, textos como texto |
| `sesion` | Registro, errores de ingreso, rutas privadas, altas aprobadas y rechazadas, recarga en vivo |
| `dev` | Cargas de saldo, ganancias y conflictos desde el panel |

Cada prueba falla si aparece un error de JavaScript, un error en la consola o una respuesta 5xx de la API. Antes y después de cada una se desconectan los riders y se cierran los pedidos abiertos, para que no se crucen ofertas.
