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

## WhatsApp

Todos los avisos a los riders salen por WhatsApp, con la API oficial de Meta (Cloud API).

1. Crear una app de tipo "Business" en developers.facebook.com y agregarle el producto WhatsApp.
2. Registrar el número de la empresa que va a mandar los avisos. Tiene que ser un número sin WhatsApp común instalado.
3. Crear un token permanente de usuario del sistema con permiso `whatsapp_business_messaging`.
4. Completar en `.env` `WHATSAPP_TOKEN` y `WHATSAPP_NUMERO_ID` (el "Phone number ID" del número, no el número).
5. En WhatsApp Manager, crear estas plantillas en categoría **Utilidad** e idioma **Español (ARG)**, y esperar a que las aprueben:

| Plantilla | Texto |
|---|---|
| `freedeli_pedido_nuevo` | 🛵 Pedido nuevo en {{1}} ({{2}}). Ganás {{3}}. Tenés {{4}} segundos para aceptarlo en la app: {{5}} |
| `freedeli_pedido_aprobado` | ✅ {{1}} te confirmó el pedido {{2}}. Pasá a retirarlo por {{3}}. |
| `freedeli_pedido_rechazado` | El kiosco eligió otro rider para el pedido {{1}}. Seguís en línea. |
| `freedeli_alta_aprobada` | ¡Hola {{1}}! Tu alta de rider en FreeDeli fue aprobada. Entrá a la app y conectate: {{2}} |
| `freedeli_alta_rechazada` | Hola {{1}}, tu alta de rider en FreeDeli no fue aprobada. Si creés que es un error, respondé este mensaje. |

Sin token, la API sigue funcionando y deja cada aviso en el log. El rider puede apagar los avisos desde su perfil.

## Mail

Usuarios, kioscos y riders recuperan la contraseña con un link por mail: vence en 30 minutos y sirve una sola vez. Sirve cualquier proveedor SMTP (el del dominio, Gmail con contraseña de aplicación, Brevo, etc.). En `deploy/.env` completar `SMTP_HOST`, `SMTP_PUERTO` (587, o 465 con TLS directo), `SMTP_USUARIO`, `SMTP_CLAVE` y `SMTP_DESDE`.

Para que los mails no caigan en spam, el dominio de `SMTP_DESDE` necesita los registros SPF y DKIM que indique el proveedor.

Sin `SMTP_HOST`, la API deja el mail con el link en el log. La clave de Dev no se recupera por mail.

## Pendiente antes de abrir al público

- Definir la tarifa de envío real (`TARIFA_CERCA`, `TARIFA_MEDIA`, `TARIFA_LEJOS`) y el alias de FreeDeli (`ALIAS_FREEDELI`).
- Dejar `HORARIO_LIBRE=false` para que solo se pida de 00 a 08 hs.
- Configurar WhatsApp y que Meta apruebe las plantillas (ver arriba).
- Configurar el SMTP para recuperar contraseñas (ver "Mail").
- La ubicación de los kioscos es aproximada (centro de la zona según la dirección). La del cliente sale del GPS del celular.
