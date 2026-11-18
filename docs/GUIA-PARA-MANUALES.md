# FreeDeli · Base para los manuales de kioscos y riders

Este documento junta todo lo que hace FreeDeli hoy (18/11/2026), contado desde el lado de quien lo usa. Sirve como materia prima para escribir el **manual de kioscos** (interactivo y PDF, obligatorio) y el **manual de riders**.

- Lo marcado con 📌 todavía no está definido o va a cambiar: conviene revisarlo antes de publicar el manual.
- Los nombres de botones van en MAYÚSCULAS, igual que en las apps.
- Las reglas completas están en [ESPECIFICACIONES.md](../ESPECIFICACIONES.md). Si algo de acá no coincide, vale ESPECIFICACIONES.

---

## 1. FreeDeli en pocas palabras

FreeDeli lleva pedidos de **kioscos 24 hs** del barrio a los clientes, de madrugada, con **riders** en moto.

| Quién | App | Dónde se usa |
|---|---|---|
| Cliente | FreeDeli | Celular |
| Kiosco | FreeDeli Kioscos | Tablet o compu en el mostrador (también anda en el celular) |
| Rider | FreeDeli Riders | Celular |
| Dueño | FreeDeli Dev | Compu |

### Reglas generales

- **Horario:** FreeDeli toma pedidos de **00 a 08 hs**, hora de Argentina.
- **Zonas:** San Miguel, Muñiz y Bella Vista. Solo se entrega dentro del área entre las tres; afuera no, también por la seguridad de los riders.
- **Sin efectivo ni tarjetas:** todo se paga por transferencia, de alias a alias.
- **Pedido mínimo:** $15.000 en productos.
- **Un pedido a la vez** por cliente.
- **Problemas y consultas:** todo se resuelve por el **WhatsApp de FreeDeli**. Cada app tiene el botón "WhatsApp FreeDeli". No hay chat dentro de las apps.
- **Las apps se instalan desde el navegador:** no están en Play Store ni App Store. Se abre la dirección y se agrega a la pantalla de inicio (ver la sección 6).

### Cómo se mueve la plata

1. El cliente transfiere el total (productos + su parte del envío) al **alias del kiosco**.
2. El kiosco **retiene** ese dinero hasta que el rider entrega con el PIN.
3. Con la entrega:
   - El kiosco le paga el **envío completo al rider** por transferencia. 📌 Hoy la app del kiosco no muestra el alias del rider: ver la sección 7.
   - La **comisión de FreeDeli** se descuenta sola del **saldo prepago** del kiosco.

| Concepto | Regla |
|---|---|
| Comisión de FreeDeli | 10 % del subtotal de productos, mínimo $1.500 |
| Envío que cobra el rider | Según la distancia en línea recta del kiosco al cliente: menos de 1,5 km **$3.000**, de 1,5 a 3 km **$4.000**, más de 3 km **$5.000** 📌 montos provisorios |
| Envío que paga el cliente | El mismo costo, con un tope de **$2.500** |
| Lo que pone el kiosco | La diferencia entre lo que cobra el rider y lo que paga el cliente (entre $500 y $2.500 por pedido) |

Por qué el kiosco pone la diferencia: de madrugada FreeDeli le acerca ventas que de otra forma no tendría.

### El recorrido de un pedido

1. El cliente pide. **El kiosco revisa el stock.**
2. Si falta algo, el kiosco lo marca y el cliente acepta el pedido ajustado o cancela.
3. El cliente transfiere. **El kiosco confirma que recibió la transferencia.**
4. Recién ahí se ofrece a los riders. **Un rider acepta y el kiosco lo aprueba** (o lo rechaza y se busca otro).
5. **Retiro:** el rider confirma "YA LO RETIRÉ" y el kiosco "CONFIRMAR ENVÍO". Hacen falta los dos.
6. El rider sale en camino y **entrega con el PIN** de 4 dígitos que le da el cliente.

---

## 2. Manual de kioscos (contenido base)

### 2.1 Qué necesita el kiosco

- Una **tablet o compu** en el mostrador, con internet, abierta durante el horario de FreeDeli. Anda también en el celular, pero en pantalla grande se ven mejor las tres columnas.
- Un **alias o CBU** donde le transfieren los clientes.
- **Saldo prepago** cargado en FreeDeli: sin saldo para la comisión mínima ($1.500) no recibe pedidos.
- Un catálogo con precios.
- 📌 Dirección de la app de kioscos: se define al contratar el dominio (hoy, en pruebas, cambia).

### 2.2 Alta y aprobación

1. En la app, **Crear cuenta**: email, contraseña (mínimo 8 caracteres), nombre del kiosco, dirección (calle y altura), zona y alias de cobro.
2. Queda **en revisión**. FreeDeli revisa y aprueba la cuenta.
3. Aprobada, entra directo a Inicio. Antes de recibir pedidos tiene que cargar saldo y productos.

**Contraseña olvidada:** en el ingreso, "¿Olvidaste tu contraseña?". Llega un mail con un link que vence en 30 minutos y sirve una sola vez. Si no llega, revisar correo no deseado.

### 2.3 Las cuatro secciones

| Sección | Para qué |
|---|---|
| **INICIO** (en vivo) | Donde llegan y se atienden los pedidos |
| **GANANCIAS** | Neto por jornada, semana o mes: lo cobrado a clientes, menos los envíos pagados a riders y las comisiones. Con gráfico |
| **PEDIDOS** | Historial de entregados y cancelados (Hoy / Semana / Mes), con lo cobrado y el neto |
| **AJUSTES** | Datos del kiosco, saldo prepago y catálogo |

### 2.4 Inicio: el tablero en vivo

Tres columnas:

- **TU TURNO:** pedidos donde el kiosco tiene que hacer algo. Es la columna que hay que mirar.
- **ESPERANDO:** pedidos que esperan al cliente (que transfiera o acepte un ajuste) o a un rider.
- **EN CAMINO:** pedidos que el rider ya está llevando.

Los pedidos aparecen y se mueven solos, sin recargar. Si no hay nada: "Nada pendiente. Los pedidos nuevos aparecen acá."

### 2.5 Paso a paso de un pedido (lo que hace el kiosco)

1. **Llega un pedido nuevo → revisar el stock.** La tarjeta dice "Marcá lo que no tenés".
   - Si hay todo: **TENGO TODO**.
   - Si falta algo: tildar lo que falta y tocar **CONFIRMAR SIN X PRODUCTOS**. El cliente decide si acepta el pedido ajustado o cancela.
2. **Esperar la transferencia.** La tarjeta muestra "El cliente tiene que transferirte $X a [alias]". Cuando el dinero está en la cuenta: **TRANSFERENCIA RECIBIDA**. ⚠️ Tocarlo solo con la plata acreditada: recién ahí se busca rider.
3. **Aprobar al rider.** Cuando un rider acepta, la tarjeta muestra su nombre, moto y patente. **APROBAR RIDER** o **Rechazar**. Si se rechaza, se busca otro y a ese rider no se le vuelve a ofrecer este pedido.
4. **Entregarle el pedido al rider.** Al dárselo en la mano: **CONFIRMAR ENVÍO**. El rider confirma por su lado "YA LO RETIRÉ"; con las dos confirmaciones pasa a Retirado.
5. **El rider entrega con el PIN.** El pedido pasa a Entregado. El dinero del cliente queda liberado: pagarle el envío al rider. La comisión ya se descontó del saldo.

**Viaje largo:** si el envío cuesta más de $2.500, la tarjeta lo avisa: "Viaje largo: el cliente paga $2.500 de envío y vos ponés $X. Al rider le pagás $Y."

### 2.6 Cancelaciones y devoluciones

- El cliente **puede cancelar en cualquier momento** antes de la entrega.
- **Si ya había transferido**, el pedido queda en TU TURNO con "El pedido se canceló. Devolvele $X al cliente, a la cuenta desde la que te transfirió." Devolver por transferencia y tocar **YA LO DEVOLVÍ**. Hasta entonces el pedido no se va de TU TURNO.
- **Si el rider ya había retirado**, el rider le devuelve los productos al kiosco.
- **Si el rider ya había hecho más de la mitad del viaje**, el envío no se le devuelve al cliente: la tarjeta dice "pagale el envío, $X" al rider.
- **Sin ningún producto en stock**, el pedido se cancela solo.

### 2.7 Saldo prepago

- Se carga **transfiriendo al alias de FreeDeli** 📌 (hoy `freedeli.pagos`, provisorio). FreeDeli acredita la carga desde su panel. 📌 Definir cómo avisa el kiosco que transfirió (por ejemplo, por WhatsApp con el comprobante).
- Se puede cargar **a cualquier hora**, y cada carga queda registrada.
- En **AJUSTES → SALDO PREPAGO** se ve el saldo actual y los movimientos: cargas y comisiones descontadas.
- Con saldo bajo aparece el aviso "Cargá saldo para no quedarte sin pedidos". **Sin saldo para la comisión mínima, el kiosco deja de recibir pedidos.**

### 2.8 Catálogo y datos del kiosco

- **AJUSTES → CATÁLOGO Y PRECIOS:** cambiar precios, marcar productos **sin stock** (no aparecen para los clientes) y **AGREGAR** productos nuevos.
- **AJUSTES → DATOS DEL KIOSCO:** nombre, dirección, alias de cobro (al que transfieren los clientes) y **tiempo estimado de entrega** en minutos (lo ve el cliente).

### 2.9 Responsabilidades del kiosco

- Tener la app abierta y atenta durante el horario.
- Confirmar el stock rápido: el cliente está esperando.
- Tocar TRANSFERENCIA RECIBIDA solo con el dinero acreditado.
- Devolver el dinero al cliente cuando se cancela, y marcarlo.
- Pagarle el envío al rider al terminar el pedido.
- Mantener el saldo prepago y el catálogo al día.
- 📌 Pausas: FreeDeli puede pausar un kiosco (por ejemplo, por reclamos). Definir en qué casos.

### 2.10 Problemas frecuentes

| Pasa esto | Qué hacer |
|---|---|
| No llegan pedidos | Revisar el saldo prepago, que la cuenta no esté pausada y que sea horario de FreeDeli (00 a 08 hs) |
| La app no muestra algo nuevo después de una actualización | Recargar la página |
| El cliente dice que transfirió pero no está acreditado | No tocar TRANSFERENCIA RECIBIDA. Consultar por WhatsApp FreeDeli |
| El rider no aparece a retirar | Avisar por WhatsApp FreeDeli |
| Cualquier otro problema con un pedido | Botón "¿Un problema con este pedido? WhatsApp FreeDeli" en la tarjeta |

---

## 3. Manual de riders (contenido base)

### 3.1 Qué necesita el rider

- **Moto**, con **seguro** y **licencia** vigentes. Se suben las fotos en el alta.
- **Celular con WhatsApp**: los avisos de pedidos llegan por ahí.
- **GPS y datos móviles** activos, y **batería cargada**. La batería, la señal y los documentos son **responsabilidad del rider**.
- Un **alias o CBU** para cobrar los envíos.
- 📌 Dirección de la app de riders: se define al contratar el dominio.

### 3.2 Alta y aprobación

1. **Crear cuenta** con:
   - nombre y apellido, DNI (7 u 8 números), celular con WhatsApp, email y contraseña;
   - moto (marca y modelo), patente (formato A123BCD o 123ABC) y alias/CBU;
   - fotos del seguro y de la licencia.
2. Queda **en revisión**. FreeDeli revisa los datos y las fotos.
3. El resultado llega **por WhatsApp**: aprobada (con el link a la app) o no aprobada.

**Contraseña olvidada:** "¿Olvidaste tu contraseña?" en el ingreso. Llega un mail con un link que vence en 30 minutos.

### 3.3 Instalar la app en el celular (recomendado)

Instalarla en la pantalla de inicio hace que abra como una app normal y que el celular la cierre menos cuando se usa Google Maps.

- **Android (Chrome):** menú ⋮ → "Agregar a la pantalla principal" o "Instalar app".
- **iPhone (Safari):** botón Compartir → "Agregar a inicio".

### 3.4 Las cinco secciones

| Sección | Para qué |
|---|---|
| **INICIO** | Botón ON/OFF y elección de zonas |
| **VIVO** | El pedido en curso |
| **HISTORIAL** | Pedidos de Hoy / Semana / Mes, con estado y monto |
| **GANANCIAS** | Total por jornada, semana o mes pasado; cantidad de pedidos, promedio, horas online y gráfico |
| **PERFIL** | Datos personales, vehículo y cobro, documentos, preferencias (avisos por WhatsApp, sonidos 8 bit), WhatsApp FreeDeli y cerrar sesión |

### 3.5 Conectarse: ON / OFF y zonas

- El botón grande **ON / OFF** ("PRESS START") pone al rider disponible.
- **Para pasar a ON hay que permitir la ubicación.** Si el celular no la da, la app explica cómo activarla.
- **Zonas:** elegir una o más entre San Miguel, Muñiz y Bella Vista. Las chances se reparten en partes iguales: 1 zona 100 %, 2 zonas 50/50, 3 zonas 34/33/33.
- Cada zona muestra los **pedidos de hoy** y los **riders activos**, para decidir dónde conviene ponerse.
- Para cerrar sesión hay que terminar antes el pedido en curso.

### 3.6 Cuando entra un pedido

- Aparece **¡PEDIDO NUEVO!** encima de cualquier pantalla, con sonido (si está activado) y vibración. También llega un **WhatsApp**, aunque la app esté cerrada.
- Hay **60 segundos** para decidir, con cuenta regresiva.
- Antes de aceptar se ve: kiosco y zona, entrega aproximada (por ejemplo "Conesa al 1800"), cantidad de productos y **la ganancia**. La dirección exacta aparece al aceptar.
- **ACEPTAR** o **Rechazar**. **Rechazar no tiene castigo**: el rider sigue ON.
- 📌 **Próximamente:** si deja **vencer 2 ofertas seguidas** sin responder, pasa a OFF solo y le llega un WhatsApp. Así no se demoran los pedidos de los demás. Rechazar no cuenta.
- Al aceptar, el kiosco lo tiene que **aprobar** ("Esperando que el kiosco te confirme…"). Si elige a otro rider, la app y el WhatsApp lo avisan, y el rider sigue en línea.

### 3.7 Pantalla VIVO: paso a paso

1. **Ir al kiosco:** "Cómo llegar" abre Google Maps con la dirección del kiosco.
2. **Retirar:** con el pedido en la mano, **YA LO RETIRÉ**. El kiosco confirma por su lado ("El kiosco ya confirmó el envío").
3. **Salir:** **SALGO EN CAMINO**. Ahora "Cómo llegar" lleva al **punto exacto donde estaba el celular del cliente** al pedir. La dirección y las notas (depto, timbre) ayudan a encontrarlo.
4. **Entregar:** pedirle al cliente su **PIN de 4 dígitos**, ingresarlo y tocar **CONFIRMAR ENTREGA**. Con el PIN correcto aparece **¡ENTREGADO!**.

**Ir y volver de Google Maps:** se puede ir a Google Maps y volver a FreeDeli tranquilo. Al volver, la app se reconecta sola, se pone al día con lo que haya pasado (por ejemplo, si el cliente canceló) y manda la ubicación. Si el celular cerró la app, al abrirla de nuevo la sesión y el pedido siguen ahí.

**El PIN solo lo tiene el cliente.** Sin PIN no se puede cerrar el pedido: si el cliente no aparece o se quedó sin batería, avisar por WhatsApp FreeDeli. FreeDeli puede marcarlo como "Entregado sin PIN".

### 3.8 Cobro

- El rider cobra el **envío completo** ($3.000, $4.000 o $5.000 según la distancia 📌 montos provisorios), aunque el cliente pague menos.
- Lo paga **el kiosco por transferencia** al alias del rider, al terminar el pedido. 📌 Ver la sección 7.
- La pantalla VIVO muestra el estado del cobro: PENDIENTE (el cliente todavía no pagó), TRANSFERIDO o LIBERADO (entregado).
- Nunca se cobra en efectivo.

### 3.9 Si se cancela el pedido

- La app avisa: "Se canceló el pedido #X. Si ya lo retiraste, **devolvé los productos al kiosco**."
- **Si ya había hecho más de la mitad del viaje**, igual cobra el envío: "Ya hiciste más de la mitad del viaje: el kiosco te paga el envío." Se mide con la última ubicación que mandó la app. Por eso conviene volver a FreeDeli de vez en cuando durante el viaje y no quedarse sin batería: **sin ninguna ubicación, no cobra**.
- Si FreeDeli marca el pedido como entregado, también se avisa.

### 3.10 Abandonos, pausas y bajas

- **Rider que acepta y después no va:** cuenta como **abandono**. Con **3 abandonos** la cuenta se pausa sola hasta que FreeDeli la evalúe: la reactiva (el conteo vuelve a cero) o la da de baja.
- FreeDeli puede **dar de baja** a un rider por abandonos o por fallas reiteradas de batería, señal o documentación. Con la baja ya no puede ingresar.
- 📌 Definir y explicar en el manual qué pasa con los documentos vencidos.

### 3.11 Avisos por WhatsApp

Llegan al celular del rider, también con la app cerrada:

- Pedido nuevo (kiosco, zona, ganancia, tiempo para aceptar y link a la app).
- El kiosco te aprobó para el pedido.
- El kiosco eligió otro rider (seguís en línea).
- Alta aprobada / alta no aprobada.

Se pueden apagar en PERFIL → PREFERENCIAS. 📌 Recomendar no apagarlos.

### 3.12 Problemas frecuentes

| Pasa esto | Qué hacer |
|---|---|
| No me deja pasar a ON | Permitir la ubicación (ver abajo) y prender el GPS |
| No me llegan pedidos | Estar en ON, sumar zonas con más demanda, revisar que la cuenta no esté pausada |
| La app quedó trabada o vieja | Cerrarla y volver a abrirla; el pedido en curso se recupera solo |
| El cliente no aparece o no tiene el PIN | WhatsApp FreeDeli |
| Cualquier otro problema | Botón WhatsApp FreeDeli en VIVO o en PERFIL |

**Cómo permitir la ubicación:**
- **Android (Chrome):** candado de la barra de direcciones → Permisos → Ubicación → Permitir.
- **iPhone:** Configuración → Privacidad y seguridad → Localización → Sitios web de Safari → "Al usar la app".

---

## 4. Lo que ve el cliente (para que kiosco y rider lo entiendan)

- Pide desde donde está: **se entrega donde estaba su celular al pedir**. Sin permiso de ubicación no puede pedir.
- Ve el **PIN de 4 dígitos** en su seguimiento y se lo da al rider recién con el pedido en la mano.
- Con el rider en camino ve "Tu rider está a 1,2 km" y puede jugar **FREEDELI RUSH**: 10 minutos seguidos jugando le dan una estrella, y con 5 estrellas gana $2.500 a favor para el próximo pedido. Lo paga FreeDeli, no el kiosco ni el rider.
- Puede cancelar en cualquier momento. Con 3 cancelaciones en una semana se le pausa la cuenta.
- A los 10 minutos sin rider, la app le pregunta si sigue esperando.

---

## 5. Lo que hace FreeDeli (el dueño, desde Dev)

Para explicar en los manuales qué resuelve FreeDeli:

- Aprueba las altas de kioscos y riders (revisa las fotos de los documentos).
- Acredita las cargas de saldo de los kioscos.
- Ve todos los pedidos en vivo, con alertas: saldo bajo, pedidos demorados, clientes y riders pausados.
- Destraba pedidos: "Entregado sin PIN", "El rider no fue" y "Cancelar".
- Pausa y reactiva kioscos y riders, y da de baja riders.
- Atiende el WhatsApp de la empresa durante el horario.

---

## 6. Instalación de las apps

| | Android (Chrome) | iPhone (Safari) | Compu o tablet |
|---|---|---|---|
| Abrir | Entrar a la dirección de la app | Entrar a la dirección de la app | Entrar a la dirección en Chrome |
| Instalar | ⋮ → "Instalar app" o "Agregar a la pantalla principal" | Compartir → "Agregar a inicio" | Ícono de instalar en la barra de direcciones (opcional) |
| Ubicación | Permitir cuando la pide | Permitir; si no la pide, ver 3.12 | No hace falta (kiosco) |

📌 Las direcciones definitivas se definen al contratar el dominio. Para los manuales conviene un **código QR** por app.

---

## 7. Pendientes que afectan a los manuales 📌

| Tema | Estado |
|---|---|
| Montos de los anillos de envío | Provisorios ($3.000 / $4.000 / $5.000) |
| Alias de FreeDeli para las cargas de saldo | Provisorio (`freedeli.pagos`) |
| Direcciones de las apps | Se definen con el dominio |
| **Pago del envío al rider** | La app del kiosco **no muestra el alias del rider** ni le recuerda pagarle al terminar el pedido. Hay que definir cómo lo hace el kiosco (por ejemplo, mostrar "Transferile $X al alias Y" en la tarjeta del pedido entregado) |
| Riders que dejan vencer ofertas | Decidido: 2 seguidas → OFF automático. Falta programarlo |
| Mensajes del alta más claros | Falta programarlo |
| Aviso "hay una versión nueva" | Falta programarlo |
| Legal: términos, privacidad y reglas | Falta escribirlo; el manual puede remitir a esos textos |
| Google Form de contingencia | Falta armarlo. Explicar en ambos manuales qué hacer si FreeDeli no funciona |

---

## Glosario

| Término | Significado |
|---|---|
| ON / OFF | Rider disponible o no para recibir pedidos |
| Oferta | Pedido que se le propone a un rider, con 60 segundos para aceptar |
| PIN | Código de 4 dígitos del cliente que cierra la entrega |
| Saldo prepago | Crédito del kiosco en FreeDeli del que se descuentan las comisiones |
| Comisión | Lo que cobra FreeDeli por pedido: 10 % de los productos, mínimo $1.500 |
| Anillo | Rango de distancia que define cuánto cobra el rider por el envío |
| Reintegro | Dinero que el kiosco le devuelve al cliente si se cancela un pedido pagado |
| Abandono | Rider que aceptó un pedido y no lo hizo |
| Pausa | Cuenta suspendida hasta que FreeDeli la reactive |
| Mitad del viaje | Si el rider pasó la mitad del camino al cliente, cobra el envío aunque se cancele |
