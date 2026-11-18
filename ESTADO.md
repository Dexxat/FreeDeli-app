# FreeDeli · Estado del proyecto

Hoja de ruta viva: en qué etapa está FreeDeli y qué sigue. Se actualiza al terminar cada bloque de trabajo.

**Última actualización:** 18/11/2026 · etapa 1 terminada: pedido completo y cancelación de punta a punta en la Mac

## Etapa actual: 2 de 4 · Probar con celulares

El código de las cuatro apps y la API está completo y probado (pruebas automáticas en verde en cada push). Ya funcionó de punta a punta en la Mac con los tres perfiles y Dev (18/11/2026). Falta probarlo en celulares reales.

## Etapas

### 1. Prueba en la Mac (gratis)

Todo corre en la Mac con Docker Desktop, igual que en el servidor. Los tres perfiles y Dev se prueban en el navegador, cada uno en su ventana.

- [x] Levantar con Docker (ver "Probarlo en la Mac" en `deploy/README.md`).
- [x] Dev ingresa con `DEV_EMAIL` y `DEV_CLAVE`.
- [x] Alta de un kiosco y de un rider; Dev los aprueba. Dev carga saldo al kiosco.
- [x] El kiosco carga productos.
- [x] Un usuario se registra y hace un pedido completo: stock → transferencia → rider → retiro → en camino → PIN → entregado.
- [x] Probar una cancelación y que el kiosco marque "Ya lo devolví".

Mejoras que salieron de la prueba (18/11/2026):

- [ ] Mensajes del alta que expliquen el formato (por ejemplo "DNI: 7 u 8 números, sin letras"), no solo "inválido".
- [ ] Avisar "Hay una versión nueva, tocá para actualizar" cuando se publica una versión: Chrome mostraba una copia vieja de la app.
- [ ] Riders "fantasma": un rider que quedó ON sin atender recibe la oferta primero y el pedido pierde 60 s por cada uno. Decidido: con **2 ofertas vencidas seguidas** pasa a OFF solo y le llega un WhatsApp. Rechazar no cuenta.

El navegador tiene que estar dentro del área de cobertura (San Miguel, Muñiz, Bella Vista). Si la Mac está en otro lugar, en Chrome: DevTools → ⋮ → More tools → Sensors → Location, con por ejemplo -34.543, -58.701.

### 2. Prueba con celulares (gratis)

Los celulares necesitan HTTPS para dar la ubicación. Sin dominio ni servidor, se usa un túnel gratuito de Cloudflare desde la Mac: da direcciones `https://….trycloudflare.com` temporales, sin cuenta.

- [x] Preparar el modo prueba: `deploy/docker-compose.prueba.yml` (ver "Probar con celulares" en `deploy/README.md`).
- [x] Pedido completo con el celular como cliente y como rider (18/11/2026).
- [x] Arreglos para ir y volver de Google Maps: reconexión automática, señal de vida del servidor cada 25 s y GPS que reintenta y se manda al volver.
- [ ] Repetir la vuelta del rider en la calle, yendo y volviendo de Google Maps.

La Mac tiene que quedar prendida y las direcciones cambian cada vez que se reinicia el túnel.

### 3. Piloto en un servidor (pago)

- [ ] Contratar el servidor: **Akamai (Linode), São Paulo, plan de 2 GB** + respaldos automáticos (USD 12 + 2,50 por mes, sin impuestos). Elegido el 18/11/2026 por cercanía a Argentina, precio fijo mensual y respaldos baratos.
- [ ] Seguridad: acceso solo con llave SSH, firewall (web y SSH), actualizaciones automáticas y swap para compilar con 2 GB.
- [ ] Dominio: se puede empezar sin comprarlo, usando la IP con sslip.io (por ejemplo `DOMINIO=203-0-113-5.sslip.io`). Después, comprar el `.com.ar`.
- [ ] Desplegar con `deploy/README.md`.
- [ ] Configurar el mail (SMTP) para recuperar contraseñas.
- [ ] Configurar WhatsApp Cloud API y que Meta apruebe las 5 plantillas.

### 4. Antes de abrir al público

- [ ] Montos reales de los anillos de envío (hoy $3.000 / $4.000 / $5.000, provisorios).
- [ ] Alias real de FreeDeli para las cargas de saldo (hoy `freedeli.pagos`).
- [ ] Legal: términos y condiciones, privacidad y reglas.
- [ ] Manual de kioscos (interactivo + PDF, obligatorio) y manual de riders. Base: `docs/GUIA-PARA-MANUALES.md`.
- [ ] Pago del envío al rider: en el pedido entregado, la tarjeta del kiosco muestra "Transferile $X al rider: alias Y" y el botón YA LE PAGUÉ (decidido el 18/11/2026, falta programarlo).
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
| 18/11/2026 | Prueba en la Mac y con celular de punta a punta; túnel de prueba; app estable al ir y volver de Google Maps; mitad del viaje con la última posición conocida |
| 18/11/2026 | `docs/GUIA-PARA-MANUALES.md`: base para los manuales de kioscos y riders |

## Documentos

- Reglas de negocio: [ESPECIFICACIONES.md](ESPECIFICACIONES.md)
- Cómo correr y probar: [README.md](README.md)
- Despliegue: [deploy/README.md](deploy/README.md)
- Prender, apagar y la rutina de guardia: [docs/GUIA-DE-GUARDIA.md](docs/GUIA-DE-GUARDIA.md)
- Base para los manuales de kioscos y riders: [docs/GUIA-PARA-MANUALES.md](docs/GUIA-PARA-MANUALES.md)
