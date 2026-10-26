# FreeDeli · Especificaciones funcionales

Documento vivo con las reglas de negocio de cada parte de la plataforma. Es la base para diseñar la arquitectura Angular. La identidad visual está en `design/README.md`.

## Visión general

FreeDeli conecta **kioscos 24 hs** del barrio con **riders** (repartidores) para hacer envíos a **usuarios**. El dueño de la plataforma es el mediador entre kioscos y riders.

| Parte | Quién la usa | Cantidad |
|---|---|---|
| FreeDeli (usuarios) | Clientes que piden | Muchos |
| FreeDeli Kioscos | Kioscos adheridos | Muchos |
| FreeDeli Riders | Repartidores | Muchos |
| FreeDeli Dev | Dueño de la plataforma | **Una sola instancia, un solo usuario** |

Zonas de operación: **San Miguel**, **Muñiz** y **Bella Vista**.

---

## FreeDeli Dev (panel de administración)

- **Acceso exclusivo:** existe una sola instancia y solo la usa el dueño. No hay otros usuarios ni roles de admin. Por ahora sin login; se protege al conectar el backend.
- **Pantalla:** pensado para compu, y usable en el celular.

### Tres grandes sectores

1. **MAIN:** selector de zonas (San Miguel, Muñiz, Bella Vista; una, dos o las tres a la vez). Muestra todos los pedidos de la jornada de las zonas elegidas. Cada fila: a un lado el id del pedido y el total para el kiosco; en el medio el estado del pedido; del otro lado el id del rider y lo que ganó.
2. **GANANCIAS:** lo cobrado por FreeDeli en los pedidos finalizados con éxito, por jornada, semana o mes.
3. **ENTREGAS:** el detalle de las entregas finalizadas.

### Además
- **Kioscos:** ver los activos, sus movimientos y el saldo que les queda para seguir operando.
- **Riders:** ver los activos, sus movimientos y el seguimiento de cada envío.
- **Ganancias:** monitorear las ganancias de la plataforma.
- **Pausar actividad:** poder pausar (y reactivar) a un kiosco o a un rider puntual.
- **Conflictos e inconvenientes:** registro y seguimiento de incidencias.
- **Sin chat interno:** la comunicación con kioscos y riders se hace por el **WhatsApp de la empresa**, no desde la plataforma. A lo sumo, un botón o link que abra ese WhatsApp.

---

## FreeDeli Riders

- **Botón ON / OFF para activarse:** el rider se pone disponible o no disponible con un interruptor grande, con estética de juego 8 bit, tipo "PRESS START".
- **Selección de zonas:** el rider elige una o más zonas a la vez, entre San Miguel, Muñiz y Bella Vista. Siempre tiene que quedar al menos una elegida.
- **Probabilidad de asignación:** el 100 % de las chances se reparte en partes iguales entre las zonas elegidas.
  - 1 zona: 100 % en esa zona.
  - 2 zonas: 50 % / 50 %.
  - 3 zonas: 34 % / 33 % / 33 %.
- **Barra de demanda por zona:** para decidir dónde ponerse en cola, cada zona muestra los **pedidos de la jornada** y los **riders activos**, y la relación entre ambos (pedidos por rider). Si en su zona no hay pedidos, el rider puede sumar otras.

### Secciones de la app (navegación inferior)

1. **Inicio:** el botón ON/OFF y la selección de zonas con su barra de demanda.
2. **Vivo (pedido en curso):** número de pedido, tiempo transcurrido, progreso (Aceptado → Retirado → En camino → Entregado), kiosco de retiro, dirección de entrega con notas, productos, estado del cobro, ganancia del envío. Botones: cómo llegar y WhatsApp de FreeDeli. Para cerrar el pedido, el rider ingresa el **PIN del cliente** (4 dígitos) y toca "Confirmar entrega".
3. **Historial de pedidos:** filtros Hoy / Semana / Mes, resumen (cantidad y total) y lista con hora, número, kiosco → destino, zona, estado (Entregado / Cancelado) y monto.
4. **Ganancias:** se ven por jornada, por semana o del mes pasado. Muestra el total, la cantidad de pedidos, el promedio por pedido, las horas online, un gráfico de barras (por hora, por día o por semana) y el desglose (envíos + propinas = total).
5. **Perfil y configuración:** datos personales (teléfono, email, DNI), vehículo (moto y patente), datos de cobro (alias/CBU), preferencias (notificaciones, sonidos 8 bit), contacto por WhatsApp con FreeDeli y cerrar sesión.

### Pedido entrante

- Solo le llegan pedidos al rider que está **ON**, no está pausado y no tiene un pedido en curso.
- El aviso aparece encima de cualquier sección, con sonido 8 bit (si están activados) y vibración.
- Tiene **30 segundos** para aceptar, con cuenta regresiva.
- Antes de aceptar ve: kiosco y zona de retiro, la entrega aproximada (calle y altura redondeada, por ejemplo "Conesa al 1800"), la cantidad de productos y su ganancia. La dirección exacta y las notas aparecen al aceptar.
- Si rechaza o deja vencer el aviso, el pedido pasa a otro rider **sin castigo**: sigue ON.
- Al aceptar, el pedido pasa a **Aceptado** y se abre la pantalla Vivo.

### Perfil: qué puede editar el rider

- Puede editar teléfono, email, moto, patente y alias/CBU.
- Nombre y DNI quedan fijos: se cambian escribiendo al WhatsApp de FreeDeli.
- No puede cerrar sesión con un pedido en curso.

Diseño de referencia: canvas, página "App Rider" (pantallas de 390×844).

---

## Pagos

- **Sin efectivo ni tarjetas.** Todo se paga por transferencia, de alias a alias.
- **Recorrido del dinero:** el cliente le paga al kiosco y el kiosco le paga al rider.
- **Liberación:** el pago del kiosco se libera cuando el rider ingresa el PIN del cliente. Así se completa el pedido.
- **Comisión de FreeDeli:** de lo que cobra el kiosco, como mínimo **$1.500** por pedido van al alias de la empresa. Se descuentan directamente del pago del cliente.
- **Quién retiene:** el cliente transfiere al alias del kiosco. El kiosco retiene el dinero hasta que el rider ingresa el PIN.
- **Al ingresar el PIN:** el kiosco le transfiere el costo de envío al rider y la comisión a FreeDeli.
- **Envío:** lo paga el cliente junto con los productos y es la ganancia del rider.
- **Comisión:** el 10 % del subtotal de productos, nunca menos de $1.500.
- **Pedido mínimo:** $15.000 en productos. Con el 10 % da justo la comisión mínima de $1.500.
- **Saldo prepago del kiosco:** el kiosco carga crédito en FreeDeli. Al liberarse cada pago, la comisión se descuenta de ese saldo. Si no le alcanza para la comisión mínima, no recibe pedidos.
- **Costo de envío:** depende de la distancia entre el kiosco y la entrega. _Pendiente: definir la tarifa._ Mientras tanto se usa un costo fijo por kiosco.

---

## FreeDeli Kioscos

_Pendiente de definir._

## FreeDeli (usuarios)

La acción principal es **PEDIR**: es el botón más grande de la pantalla de inicio.

### Flujo de pedido

1. **Inicio:** saludo, dirección de entrega (con opción de cambiarla), el botón grande **PEDIR** (con la cantidad de kioscos abiertos), el pedido en curso con su barra de estado y un acceso para pedir de nuevo en kioscos recientes.
2. **Kioscos disponibles:** lista de los kioscos abiertos, con filtro por zona (Todas / San Miguel / Muñiz / Bella Vista). Cada uno muestra la zona, el tiempo estimado y el costo de envío.
3. **Kiosco (armar el pedido):** productos con botones − / +, y una barra inferior con la cantidad, el total (productos + envío) y el botón **HACER PEDIDO**.
4. **Pedido realizado:** confirmación con el número de pedido, la barra de estado esperando que un rider acepte y el resumen (kiosco, productos, envío, total).
5. **Seguimiento:** el tiempo estimado, la barra de estado, el **PIN de entrega** de 4 dígitos, los datos del rider y un contacto por WhatsApp con FreeDeli.
6. **Entrega confirmada:** pantalla final cuando el rider ingresa el PIN correcto.

### Barra de estado (compartida con Riders)

**Aceptado → Retirado → En camino → Entregado.** Tiene que verse igual en la app del usuario y en la del rider: mismo componente, mismos colores (celeste = completado, amarillo = paso actual, oscuro = pendiente).

### PIN de entrega

- Se genera un PIN de 4 dígitos por pedido y solo lo ve el usuario.
- El usuario se lo da al rider recién cuando tiene el pedido en la mano.
- En la pantalla "Vivo", el rider ingresa el PIN y toca **CONFIRMAR ENTREGA**. Si el PIN es correcto, el pedido pasa a **Entregado** en las dos apps.

### Un pedido a la vez

El usuario puede tener un solo pedido abierto. Mientras tenga uno en curso, PEDIR lo lleva al seguimiento.

Navegación inferior: Inicio · Pedir · Mi pedido · Ajustes. _Pendiente: definir la pantalla de Ajustes (el diseño ya la incluye)._

Diseño de referencia: canvas, página "App Usuario".
