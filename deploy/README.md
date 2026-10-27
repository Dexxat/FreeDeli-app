# Despliegue de FreeDeli

Todo corre en un VPS con Docker Compose:

| Servicio | Qué hace |
|---|---|
| `postgres` | Base de datos, con los datos en un volumen |
| `api` | La API (NestJS). Al arrancar aplica las migraciones pendientes |
| `web` | Caddy: sirve las cuatro apps con HTTPS automático y pasa `/api` a la API |

| Dirección | App |
|---|---|
| `https://DOMINIO` | FreeDeli (usuarios) |
| `https://kioscos.DOMINIO` | FreeDeli Kioscos |
| `https://riders.DOMINIO` | FreeDeli Riders |
| `https://dev.DOMINIO` | FreeDeli Dev (el dueño) |

Cada app llama a la API en `/api` de su propio subdominio, así que no hace falta configurar CORS.

## Primera vez

1. **VPS.** Con 2 GB de RAM alcanza para empezar (Hetzner, DigitalOcean o similar), con Ubuntu 24.04. Instalar Docker con `curl -fsSL https://get.docker.com | sh`.
2. **DNS.** En el proveedor del dominio, crear registros `A` hacia la IP del VPS para `@`, `www`, `kioscos`, `riders` y `dev`.
3. **Código y configuración.**
   ```bash
   git clone <repo> FreeDeli && cd FreeDeli/deploy
   cp .env.example .env
   nano .env   # DOMINIO, EMAIL_ADMIN, claves (ver los comentarios) y la cuenta del dueño
   ```
4. **Arrancar.**
   ```bash
   docker compose up -d --build
   docker compose logs -f api   # debería decir "Cuenta Dev creada"
   ```
   Caddy pide los certificados HTTPS solo, en cuanto el DNS apunta al VPS.
5. **Probar.** `https://DOMINIO/api/salud` responde `{"ok":true}`. Ingresar a `https://dev.DOMINIO` con `DEV_EMAIL` y `DEV_CLAVE`.

## Probarlo en la Mac

Con Docker Desktop se puede levantar todo igual que en el servidor, usando `localhost` como dominio:

```bash
cd deploy
cp .env.example .env   # DOMINIO=localhost y completar las claves
docker compose up -d --build
```

Las apps quedan en https://localhost, https://kioscos.localhost, https://riders.localhost y https://dev.localhost. Caddy usa un certificado local que el navegador no reconoce: la primera vez hay que aceptar la advertencia ("Configuración avanzada" → "Continuar").

Para apagarlo: `docker compose down` (los datos quedan en el volumen; `docker compose down -v` los borra).

## Actualizar

```bash
cd FreeDeli && git pull
cd deploy && docker compose up -d --build
```

Las migraciones nuevas de la base se aplican solas al reiniciar la API.

## Respaldos

`respaldo.sh` guarda un `pg_dump` comprimido en `deploy/respaldos/` y conserva los últimos 14 días. Programarlo con cron:

```bash
crontab -e
0 4 * * * /root/FreeDeli/deploy/respaldo.sh
```

Conviene copiar esa carpeta fuera del VPS cada tanto.

Para restaurar un respaldo:

```bash
gunzip -c respaldos/freedeli-AAAAMMDD-HHMM.sql.gz | docker compose exec -T postgres psql -U freedeli freedeli
```

## Pendiente antes de abrir al público

- Definir la tarifa de envío real (`TARIFA_CERCA`, `TARIFA_MEDIA`, `TARIFA_LEJOS`) y el alias de FreeDeli (`ALIAS_FREEDELI`).
- Dejar `HORARIO_LIBRE=false` para que solo se pida de 00 a 08 hs.
- Cargar el WhatsApp real de la empresa en `projects/shared/src/lib/config/freedeli.config.ts`.
- La ubicación de las direcciones es aproximada (centro de la zona). Para distancias reales hace falta un servicio de mapas.
