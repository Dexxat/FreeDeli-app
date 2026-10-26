# FreeDeli

Plataforma que conecta kioscos 24 hs del barrio con riders para hacer envíos a usuarios. Las reglas de negocio están en [ESPECIFICACIONES.md](ESPECIFICACIONES.md) y la identidad visual en [design/README.md](design/README.md).

## Estructura

| Carpeta | Qué es |
|---|---|
| `projects/usuarios-app` | App FreeDeli para quienes piden (PWA, celular) |
| `projects/kioscos-app` | App FreeDeli Kioscos (PWA, tablet o compu) |
| `projects/riders-app` | App FreeDeli Riders (PWA, celular) |
| `projects/dev-admin` | Panel FreeDeli Dev del dueño (compu, usable en celular) |
| `projects/shared` | Librería común: modelos y reglas del dominio, componentes, mocks y cliente HTTP |
| `backend` | API con NestJS y Postgres; ver [backend/README.md](backend/README.md) |

Las reglas del pedido (`projects/shared/src/lib/rules`) son las mismas en las apps y en la API.

## Correr las apps

Con datos simulados, sin API:

```bash
npm install
npx ng serve usuarios-app --port 4301
npx ng serve riders-app --port 4300
npx ng serve dev-admin --port 4302
npx ng serve kioscos-app --port 4303
```

Contra la API local (Usuarios, Riders y Kioscos ya están conectadas):

```bash
cd backend && npm run db           # Postgres embebido, en otra terminal
cd backend && npm run start:dev    # API en http://localhost:3000/api
npx ng serve usuarios-app -c api --port 4301
npx ng serve riders-app -c api --port 4300
npx ng serve kioscos-app -c api --port 4303
```

## Tests

```bash
npx ng test shared --watch=false   # y cada app: riders-app, usuarios-app, kioscos-app, dev-admin
cd backend && npm test && npm run test:e2e
```
