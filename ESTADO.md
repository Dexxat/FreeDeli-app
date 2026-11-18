# FreeDeli · Estado del proyecto

Hoja de ruta viva: en qué etapa está FreeDeli y qué sigue. Se actualiza al terminar cada bloque de trabajo.

**Última actualización:** 18/11/2026

## Etapa actual: 1 de 4 · Probar todo en la Mac

El código de las cuatro apps y la API está completo y probado (pruebas automáticas en verde en cada push). Falta verlo funcionando de punta a punta con personas usando los tres perfiles, primero en la Mac y después en celulares.

## Etapas

### 1. Prueba en la Mac (gratis)

Todo corre en la Mac con Docker Desktop, igual que en el servidor. Los tres perfiles y Dev se prueban en el navegador, cada uno en su ventana.

- [ ] Levantar con Docker (ver "Probarlo en la Mac" en `deploy/README.md`).
- [ ] Dev ingresa con `DEV_EMAIL` y `DEV_CLAVE`.
- [ ] Alta de un kiosco y de un rider; Dev los aprueba. Dev carga saldo al kiosco.
- [ ] El kiosco carga productos.
- [ ] Un usuario se registra y hace un pedido completo: stock → transferencia → rider → retiro → en camino → PIN → entregado.
- [ ] Probar una cancelación y que el kiosco marque "Ya lo devolví".

El navegador tiene que estar dentro del área de cobertura (San Miguel, Muñiz, Bella Vista). Si la Mac está en otro lugar, en Chrome: DevTools → ⋮ → More tools → Sensors → Location, con por ejemplo -34.543, -58.701.

### 2. Prueba con celulares (gratis)

Los celulares necesitan HTTPS para dar la ubicación. Sin dominio ni servidor, se usa un túnel gratuito de Cloudflare desde la Mac: da direcciones `https://….trycloudflare.com` temporales, sin cuenta.

- [ ] Preparar el modo prueba (Caddy con un puerto por app y un túnel por app). _Falta hacerlo._
- [ ] Probar con 3 celulares: cliente, rider y kiosco (o el kiosco en la compu).

La Mac tiene que quedar prendida y las direcciones cambian cada vez que se reinicia el túnel.

### 3. Piloto en un servidor (pago)

- [ ] Contratar un VPS de 2 GB (Hetzner, DigitalOcean o similar).
- [ ] Dominio: se puede empezar sin comprarlo, usando la IP con sslip.io (por ejemplo `DOMINIO=203-0-113-5.sslip.io`). Después, comprar el `.com.ar`.
- [ ] Desplegar con `deploy/README.md`.
- [ ] Configurar el mail (SMTP) para recuperar contraseñas.
- [ ] Configurar WhatsApp Cloud API y que Meta apruebe las 5 plantillas.

### 4. Antes de abrir al público

- [ ] Montos reales de los anillos de envío (hoy $3.000 / $4.000 / $5.000, provisorios).
- [ ] Alias real de FreeDeli para las cargas de saldo (hoy `freedeli.pagos`).
- [ ] Legal: términos y condiciones, privacidad y reglas.
- [ ] Manual de kioscos (interactivo + PDF, obligatorio) y manual de riders.
- [ ] Google Form de contingencia para tomar pedidos a mano si se cae el servidor.
- [ ] `HORARIO_LIBRE=false`: pedidos solo de 00 a 08 hs.

## Hecho

| Fecha | Bloque |
|---|---|
| oct 2026 | Las cuatro apps (Usuarios, Kioscos, Riders, Dev), la API y la base de datos |
| oct 2026 | Pagos por transferencia, comisión, saldo prepago del kiosco, PIN de entrega |
| oct 2026 | FREEDELI RUSH (estrellas y $2.500 a favor) |
| oct 2026 | Avisos a riders por WhatsApp (falta configurar la cuenta de Meta) |
| 28/10/2026 | Cancelaciones e incidentes: reintegros, pausas, sin rider a los 10 min, herramientas de Dev |
| 28/10/2026 | GPS del cliente y del rider, regla de la mitad del viaje |
| 28/10/2026 | Recuperar la contraseña por mail (falta configurar el SMTP) |
| 30/10/2026 | WhatsApp real de la empresa |

## Documentos

- Reglas de negocio: [ESPECIFICACIONES.md](ESPECIFICACIONES.md)
- Cómo correr y probar: [README.md](README.md)
- Despliegue: [deploy/README.md](deploy/README.md)
