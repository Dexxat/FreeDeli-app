# FreeDeli · Guía de guardia

Tu guía para prender FreeDeli, cuidarlo durante la noche y apagarlo. Tiene dos momentos:

- **Ahora (pruebas):** FreeDeli corre en tu Mac con Docker y los celulares entran por un túnel. Se prende y se apaga cada jornada.
- **Con el servidor (piloto):** FreeDeli corre solo, las 24 horas, en Akamai. **No se apaga**: fuera de 00 a 08 hs simplemente no toma pedidos. Tu guardia es mirar que todo ande.

> Los comandos se escriben en la app **Terminal** de la Mac (Cmd + Espacio → "Terminal"). Copialos tal cual, uno por vez, y apretá Enter.

---

## 1. Prender FreeDeli (pruebas en la Mac)

**Paso 1. Abrir Docker Desktop.**
Abrilo desde Aplicaciones y esperá a que la ballena de la barra de arriba deje de moverse (un minuto, más o menos).

**Paso 2. Ir a la carpeta del proyecto:**

```bash
cd ~/Documents/FreeDeli/deploy
```

**Paso 3. Prender todo** (base de datos, API, las cuatro apps y los túneles para celulares):

```bash
docker compose -f docker-compose.yml -f docker-compose.prueba.yml up -d
```

**Paso 4. Ver que esté sano.** Tiene que responder `{"ok":true}`:

```bash
curl -k https://localhost/api/salud
```

**Paso 5. Ver las direcciones para los celulares** (esperá unos 15 segundos después del paso 3):

```bash
docker compose -f docker-compose.yml -f docker-compose.prueba.yml logs tunel-usuarios tunel-riders tunel-kioscos | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com'
```

Salen tres direcciones, en este orden: **Usuarios, Riders, Kioscos**. ⚠️ **Cambian cada vez que prendés**: mandáselas de nuevo a quienes prueben. Si no salen tres, esperá unos segundos y repetí el comando.

**Paso 6. Entrar al panel de Dev** en Chrome: https://dev.localhost

---

## 2. Apagar FreeDeli (al terminar la jornada de pruebas)

**Antes de apagar:** que no queden pedidos a medio camino (ver la sección 4, "Al cerrar la jornada").

```bash
cd ~/Documents/FreeDeli/deploy
docker compose -f docker-compose.yml -f docker-compose.prueba.yml down
```

Los datos (cuentas, pedidos, saldos) **quedan guardados** y vuelven al prender. Después podés cerrar Docker Desktop.

> ⛔ **Nunca** uses `down -v`: borra la base de datos completa.

**Respaldo de la base** (recomendado al cerrar, tarda unos segundos):

```bash
cd ~/Documents/FreeDeli/deploy && ./respaldo.sh
```

Queda en `deploy/respaldos/` y se guardan los últimos 14 días. Hacelo con FreeDeli todavía prendido, antes del `down`.

---

## 3. Comandos útiles

Todos desde `~/Documents/FreeDeli/deploy`.

| Para qué | Comando |
|---|---|
| Ver si está todo prendido | `docker compose ps` |
| ¿Responde la API? | `curl -k https://localhost/api/salud` |
| Ver lo que pasa en la API en vivo (salir con Ctrl + C) | `docker compose logs -f api` |
| Ver los últimos errores | `docker compose logs api --tail 100 \| grep -i error` |
| Reiniciar la API (si algo quedó trabado) | `docker compose restart api` |
| Reiniciar todo, sin perder datos | `docker compose restart` |
| Volver a ver las direcciones de los celulares | el comando del paso 5 |
| Instalar una versión nueva del código | `cd ~/Documents/FreeDeli && git pull && cd deploy && docker compose up -d --build api web` |

En `docker compose ps`, cada línea tiene que decir **Up** (y `api` y `postgres`, además, **healthy**).

---

## 4. La rutina de la guardia (00 a 08 hs)

### Antes de las 00

- [ ] FreeDeli prendido y sano (sección 1, pasos 3 y 4). Con el servidor: solo el paso 4, con tu dominio.
- [ ] Panel de Dev abierto en la compu.
- [ ] **WhatsApp de la empresa** abierto: por ahí llegan todos los problemas de kioscos y riders.
- [ ] En MAIN, revisar **ALTAS PENDIENTES**: aprobar o rechazar kioscos y riders nuevos (mirar las fotos del seguro y la licencia).
- [ ] **Cargas de saldo:** si un kiosco te transfirió, acreditarle la carga desde su ficha (Kioscos y saldos → el kiosco). Un kiosco sin saldo no recibe pedidos.
- [ ] Mirar si hay riders conectados en cada zona. Sin riders no hay app: si no hay, avisar por WhatsApp.

### Durante la noche: las alertas de MAIN

Arriba de MAIN aparecen las alertas. Qué hacer con cada una:

| Alerta | Qué significa | Qué hacer |
|---|---|---|
| **SALDO** | Un kiosco se está quedando sin saldo prepago | Avisarle por WhatsApp que cargue. Si transfiere, acreditar la carga |
| **DEMORA** | Un pedido lleva más de 10 minutos sin rider (o esperando al kiosco) | Mirar en qué paso está: si el kiosco no confirma, escribirle; si no hay riders, escribirles a los de la zona |
| **CLIENTE** | Un cliente se pausó solo por 3 cancelaciones en la semana | Si te escribe y es razonable, **Reactivar** |
| **RIDER** | Un rider se pausó solo por 3 abandonos | Hablar con él. Desde su ficha: reactivarlo o **Dar de baja** |

### Durante la noche: incidentes con un pedido

Cada pedido abierto en MAIN (y el envío en curso en la ficha del rider) tiene tres botones:

| Pasa esto | Botón |
|---|---|
| El rider entregó, pero el cliente no tiene el PIN (sin batería, no aparece) | **Entregado sin PIN** |
| El rider aceptó y no va a ir | **El rider no fue** (al cliente se le devuelve todo y al rider le cuenta un abandono) |
| Cualquier otro pedido que hay que cerrar | **Cancelar** |

Antes de tocar cualquiera, hablá con las partes por WhatsApp: no se pueden deshacer.

### Durante la noche: cosas a las que estar atento

- **Riders que no responden.** Hasta que se programe la regla de "2 ofertas vencidas → OFF", un rider que quedó ON sin mirar el celular le hace perder 60 segundos a cada pedido. Si ves pedidos que tardan en tomarse, escribile o pausalo desde su ficha.
- **Devoluciones pendientes.** Si un cliente canceló después de pagar, el kiosco tiene que devolverle y tocar YA LO DEVOLVÍ. Si el cliente reclama, confirmá con el kiosco.
- **Pago al rider.** Hasta que la app muestre el alias del rider en el kiosco, el rider le tiene que pasar su alias al kiosco para cobrar el envío.
- **Quejas de "no se actualiza".** Pedirle a la persona que cierre y abra la app. Si les pasa a varios, revisar la API (sección 5).

### Al cerrar la jornada (08 hs)

- [ ] En MAIN no tiene que quedar ningún pedido abierto. Si queda alguno, resolverlo con los botones de incidentes.
- [ ] Revisar que no queden devoluciones a clientes sin marcar.
- [ ] Mirar **GANANCIAS** y **ENTREGAS** de la jornada.
- [ ] Respaldo de la base (sección 2).
- [ ] Pruebas en la Mac: apagar (sección 2). Con el servidor: **no se apaga**.

---

## 5. Si algo falla

| Síntoma | Qué probar, en orden |
|---|---|
| Ninguna app abre | 1) ¿Docker Desktop está abierto? 2) `docker compose ps` 3) Prender de nuevo (sección 1, paso 3) |
| Las apps abren pero no cargan datos | 1) `curl -k https://localhost/api/salud` 2) `docker compose restart api` 3) Ver errores: `docker compose logs api --tail 100` |
| Los celulares no entran | Las direcciones del túnel cambiaron: volver a sacarlas (paso 5) y mandarlas |
| Algo se ve viejo después de instalar una versión nueva | Recargar con Cmd + Shift + R (en el celular: cerrar y abrir la app) |
| Nada de lo anterior funciona | Contingencia: tomar los pedidos a mano 📌 (Google Form, falta armarlo) y escribirme con lo que dicen los logs |

Si me pedís ayuda, copiá lo que muestra `docker compose logs api --tail 100`: con eso puedo ver qué pasó.

---

## 6. Con el servidor (etapa 3) 📌

Se completa cuando contratemos Akamai. Lo que cambia:

- **No se prende ni se apaga:** FreeDeli queda andando siempre y se reinicia solo si el servidor se reinicia.
- **Las direcciones son fijas** (tu dominio): no hay túneles.
- **Para entrar al servidor** desde la Terminal: `ssh freedeli@IP-DEL-SERVIDOR`, y después `cd FreeDeli/deploy`. Los comandos de la sección 3 son los mismos, cambiando `https://localhost` por tu dominio.
- **Los respaldos son automáticos** todas las noches, además de los de Akamai.
- **El horario lo cuida la app:** con `HORARIO_LIBRE=false`, los clientes solo pueden pedir de 00 a 08 hs.

---

## Nunca

- ⛔ `docker compose down -v`: borra la base de datos.
- ⛔ Borrar o compartir `deploy/.env`: tiene las claves (la de Dev, la de la base y la que firma las sesiones).
- ⛔ Cambiar datos directamente en la base: todo se hace desde el panel de Dev.
- ⛔ Tocar TRANSFERENCIA RECIBIDA por un kiosco, ni dar el PIN de un cliente.
