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

**Contraseña olvidada:** en Usuarios, Kioscos y Riders, "¿Olvidaste tu contraseña?" manda un link por mail para elegir una nueva, sin intervención de Dev. Vence en 30 minutos y sirve una sola vez. Al guardarla entra directo a su app. La respuesta es la misma exista o no la cuenta. La clave de Dev no se recupera por mail.

---

## FreeDeli Dev (panel de administración)

- **Acceso exclusivo:** existe una sola instancia y solo la usa el dueño. No hay otros usuarios ni roles de admin. Por ahora sin login; se protege al conectar el backend.
- **Pantalla:** pensado para compu, y usable en el celular.

### Tres grandes sectores

1. **MAIN:** selector de zonas (San Miguel, Muñiz, Bella Vista; una, dos o las tres a la vez). Muestra todos los pedidos de la jornada de las zonas elegidas. Cada fila: a un lado el id del pedido y el total para el kiosco; en el medio el estado del pedido; del otro lado el id del rider y lo que ganó.
2. **GANANCIAS:** lo cobrado por FreeDeli en los pedidos finalizados con éxito, por jornada, semana o mes.
3. **ENTREGAS:** el detalle de las entregas finalizadas.

Dentro de MAIN también están:

- **Fichas:** tocar un kiosco abre su ficha con saldo, movimientos y pausa. Tocar el id de un rider abre la suya con el seguimiento del envío en curso, sus envíos y la pausa.
- **Kioscos y saldos:** enlace a la lista de kioscos con su saldo prepago.

### Además
- **Kioscos:** ver los activos, sus movimientos y el saldo que les queda para seguir operando.
- **Riders:** ver los activos, sus movimientos y el seguimiento de cada envío.
- **Ganancias:** monitorear las ganancias de la plataforma.
- **Pausar actividad:** poder pausar (y reactivar) a un kiosco o a un rider puntual, y dar de baja a un rider.
- **Destrabar pedidos:** cada pedido abierto de MAIN (y el envío en curso en la ficha del rider) tiene "Entregado sin PIN", "El rider no fue" y "Cancelar". Ver _Cancelaciones e incidentes_.
- **Alertas en MAIN:** saldo bajo, pedidos demorados, clientes pausados por cancelaciones (con el botón Reactivar) y riders pausados por abandonos.
- **Cargas de saldo a cualquier hora:** cada carga queda registrada en los movimientos del kiosco.
- **Conflictos:** todos, de kioscos y de riders, se resuelven por **WhatsApp** con la asistencia, que atiende el número de la empresa durante el horario de FreeDeli. La plataforma no los registra: cada app tiene el botón de WhatsApp FreeDeli.
- **Sin chat interno:** la comunicación con kioscos y riders se hace por el **WhatsApp de la empresa**, no desde la plataforma. A lo sumo, un botón o link que abra ese WhatsApp.

---

## FreeDeli Riders

- **Alta:** el rider carga nombre y apellido, DNI, teléfono, email, moto, patente, alias de cobro y las **fotos del seguro y de la licencia**, que son obligatorias. Dev ve las fotos antes de aprobar. La app las comprime antes de subirlas, y el rider las puede actualizar desde su perfil.
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
5. **Perfil y configuración:** datos personales (nombre y apellido, DNI, teléfono, email), vehículo (moto y patente), datos de cobro (alias/CBU), preferencias (avisos por WhatsApp, sonidos 8 bit), contacto por WhatsApp con FreeDeli y cerrar sesión.

### Pedido entrante

- Solo le llegan pedidos al rider que está **ON**, no está pausado y no tiene un pedido en curso.
- El aviso aparece encima de cualquier sección, con sonido 8 bit (si están activados) y vibración.
- **Avisos por WhatsApp:** todos los avisos al rider llegan por WhatsApp, también con la app cerrada: pedido nuevo (con el link a la app), el kiosco lo aprobó, el kiosco eligió a otro, y el alta aprobada o rechazada. El rider los puede apagar en su perfil. Por eso el teléfono del rider tiene que ser un celular con WhatsApp.
- Tiene **60 segundos** para aceptar, con cuenta regresiva.
- Antes de aceptar ve: kiosco y zona de retiro, la entrega aproximada (calle y altura redondeada, por ejemplo "Conesa al 1800"), la cantidad de productos y su ganancia. La dirección exacta y las notas aparecen al aceptar.
- Si rechaza o deja vencer el aviso, el pedido pasa a otro rider **sin castigo**: sigue ON.
- Al aceptar, el pedido pasa a **Aceptado** y se abre la pantalla Vivo.

### Perfil: qué puede editar el rider

- Puede editar nombre y apellido, DNI, teléfono, email, moto, patente, alias/CBU y las fotos del seguro y la licencia.
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
- **Envío dividido:** el rider siempre cobra el costo completo del viaje. El cliente paga ese costo hasta un tope de **$2.500**. Si el viaje cuesta más, el kiosco pone la diferencia.
- **Por qué el kiosco pone la diferencia:** de madrugada FreeDeli le acerca ventas que de otra forma no tendría.
- **Comisión:** el 10 % del subtotal de productos, nunca menos de $1.500.
- **Pedido mínimo:** $15.000 en productos. Con el 10 % da justo la comisión mínima de $1.500.
- **Saldo prepago del kiosco:** el kiosco carga crédito en FreeDeli. Al liberarse cada pago, la comisión se descuenta de ese saldo. Si no le alcanza para la comisión mínima, no recibe pedidos.
- **Horario:** FreeDeli toma pedidos de **00 a 08 hs**, hora de Argentina. Fuera de ese horario la app de usuarios avisa que está cerrado y no deja pedir. Los kioscos no tienen horario propio: solo se suman kioscos abiertos en ese horario, y reciben pedidos mientras no estén pausados y tengan saldo.
- **Costo de envío por anillos:** lo que cobra el rider es un monto fijo según la distancia en línea recta entre el kiosco y el GPS del cliente. De madrugada no hay tráfico, así que no se mide el tiempo ni se usan APIs de mapas pagas.
  - Menos de 1,5 km: $3.000.
  - De 1,5 a 3 km: $4.000.
  - Más de 3 km: $5.000.
  - _Montos de los anillos provisorios._ Con el tope de $2.500 para el cliente, el kiosco pone entre $500 y $2.500 por pedido.
- **Área de cobertura:** FreeDeli entrega solo dentro del rombo entre San Miguel, Muñiz y Bella Vista. Afuera no se entrega, también porque son zonas menos seguras para los riders. Si el GPS del cliente está fuera del área, no puede pedir. Las esquinas son:
  - Norte, terminal de ómnibus San Miguel: -34.532705, -58.701625.
  - Este, Av. Pres. Illia y Moine: -34.554047, -58.672300.
  - Sur, Av. Gaspar Campos en Bella Vista: -34.572896, -58.692213.
  - Oeste, Av. España y Fernando Fader: -34.551329, -58.721658.

### GPS

- **Cliente:** el pedido se entrega **donde está el celular** al pedir. Sin permiso de ubicación no puede pedir: la app le explica cómo activarla. La dirección y las notas quedan como referencia para que el rider lo encuentre.
- **Rider:** sin permiso de ubicación no puede pasar a ON. Mientras lleva un pedido (de Aceptado a Entregado), su app manda la posición cada 15 segundos. El cliente ve cuánto le falta ("Tu rider está a 1,2 km") y "Cómo llegar" lo lleva al punto exacto del cliente.
- **Batería y señal son responsabilidad del rider:** una posición de más de 2 minutos no cuenta.
- Solo se guarda la última posición del rider en el pedido en curso, no un recorrido.
- El navegador solo da la ubicación en sitios con HTTPS.

---

## FreeDeli Kioscos

- **Dispositivo:** tablet o compu en el mostrador. Menú lateral; en el celular, menú inferior.
- **Secciones:** Inicio (en vivo), Ganancias, Pedidos (historial) y Ajustes.
- **Inicio en vivo:** acá llegan los pedidos y se ven los que están en proceso. El kiosco confirma el stock, acepta al rider y confirma el envío.
- **Transferencia del cliente:** el kiosco la confirma a mano con un botón. Recién ahí se busca rider.
- **Carga de saldo:** el kiosco transfiere al alias de FreeDeli y el dueño acredita la carga desde la ficha del kiosco en Dev.
- **Ganancias:** neto por jornada, semana o mes: lo cobrado a clientes, menos los envíos pagados a riders y las comisiones descontadas del saldo. Con gráfico por hora o por día.
- **Pedidos:** historial de entregados y cancelados por Hoy / Semana / Mes, con lo cobrado y el neto.
- **Ajustes:** datos del kiosco (nombre, dirección, alias de cobro, tiempo estimado); carga de saldo (alias de FreeDeli, saldo actual e historial de cargas y comisiones); catálogo y precios (cambiar precios, marcar sin stock, agregar productos). Los productos sin stock no aparecen para los clientes.
- _Pendiente:_ el alias real de FreeDeli para las cargas. Por ahora es `freedeli.pagos`.

### Flujo del pedido (compartido por las tres apps)

1. **Stock:** llega el pedido y el kiosco confirma el stock.
2. **Ajuste:** si falta algo, el kiosco lo quita. El cliente ve el pedido ajustado y acepta o cancela.
3. **Transferencia:** con el stock confirmado, el cliente ve el alias del kiosco y transfiere. El kiosco toca "Transferencia recibida".
4. **Rider:** recién ahí se ofrece a los riders. Cuando uno acepta, el kiosco lo aprueba o lo rechaza; si lo rechaza, se busca otro.
5. **Retiro:** con el rider aprobado, el pedido está Aceptado. Pasa a Retirado cuando confirman los dos: el kiosco ("Confirmar envío") y el rider ("Ya lo retiré").
6. **Entrega:** el rider sale en camino y cierra con el PIN del cliente.

Si al quitar productos el pedido queda por debajo del mínimo, se mantiene igual: el cliente decide si lo acepta. La comisión se recalcula con el mínimo de $1.500.

### Cancelaciones e incidentes

- **El cliente puede cancelar en cualquier momento** antes de la entrega. Si todavía no transfirió, no hay nada que devolver.
- **Reintegro:** si ya transfirió, el kiosco le devuelve todo por transferencia, a la cuenta desde la que pagó, sin cupones. El pedido le queda en "Tu turno" al kiosco hasta que toca "Ya lo devolví".
- **Mitad del viaje:** si el rider en camino ya hizo más de la mitad del trayecto, el envío no se devuelve: el kiosco se lo paga al rider. Se mide con el GPS del rider: está más cerca del cliente que la mitad de la distancia entre el kiosco y el cliente. Sin una posición de los últimos 2 minutos, el reintegro es total.
- **Productos:** si el rider ya los retiró, se los devuelve al kiosco. La app del rider se lo avisa al cancelarse.
- **3 cancelaciones en una semana** pausan la cuenta del cliente: no puede pedir hasta que Dev la reactive desde la alerta en MAIN. Al reactivarla, el conteo vuelve a cero.
- **Sin rider:** a los **10 minutos** buscando rider, la app le pregunta al cliente si sigue esperando. Si sigue, se le vuelve a preguntar en otros 10 minutos. Si cancela, no le cuenta como cancelación.
- **El rider que decide no ir:** se resuelve por WhatsApp. Dev cancela con "El rider no fue": reintegro total al cliente y un abandono para el rider. Con **3 abandonos** el rider se pausa solo hasta que Dev lo evalúe: lo reactiva (el conteo vuelve a cero) o lo da de baja.
- **Cliente sin batería, sin datos o que no aparece:** si el rider entregó pero no pudo ingresar el PIN, Dev lo marca "Entregado sin PIN" y se liquida como cualquier entrega.
- **Baja de riders:** Dev puede dar de baja a un rider por abandonos o por fallas reiteradas con la batería, la señal o la documentación. Ya no puede ingresar.

## FreeDeli (usuarios)

La acción principal es **PEDIR**: es el botón más grande de la pantalla de inicio.

### Flujo de pedido

1. **Inicio:** saludo, dirección de referencia para el rider (con opción de cambiarla), el aviso si falta el permiso de ubicación, el botón grande **PEDIR** (con la cantidad de kioscos abiertos), el pedido en curso con su barra de estado y un acceso para pedir de nuevo en kioscos recientes.
2. **Kioscos disponibles:** lista de los kioscos abiertos, con filtro por zona (Todas / San Miguel / Muñiz / Bella Vista). Cada uno muestra la zona, el tiempo estimado y el costo de envío.
3. **Kiosco (armar el pedido):** productos con botones − / +, y una barra inferior con la cantidad, el total (productos + envío) y el botón **HACER PEDIDO**.
4. **Pedido realizado:** confirmación con el número de pedido, la barra de estado esperando que un rider acepte y el resumen (kiosco, productos, envío, total).
5. **Seguimiento:** el tiempo estimado, la barra de estado, a cuánto está el rider en camino, el **PIN de entrega** de 4 dígitos, los datos del rider y un contacto por WhatsApp con FreeDeli.
6. **Entrega confirmada:** pantalla final cuando el rider ingresa el PIN correcto.

### Barra de estado (compartida con Riders)

**Aceptado → Retirado → En camino → Entregado.** Tiene que verse igual en la app del usuario y en la del rider: mismo componente, mismos colores (celeste = completado, amarillo = paso actual, oscuro = pendiente).

### PIN de entrega

- Se genera un PIN de 4 dígitos por pedido y solo lo ve el usuario.
- El usuario se lo da al rider recién cuando tiene el pedido en la mano.
- En la pantalla "Vivo", el rider ingresa el PIN y toca **CONFIRMAR ENTREGA**. Si el PIN es correcto, el pedido pasa a **Entregado** en las dos apps.

### FREEDELI RUSH

- **Cuándo:** el minijuego aparece en el seguimiento mientras el rider está **en camino**. La moto avanza sola y se salta (con doble salto) tachos, arbustos, bolsas y pozos.
- **Estrellas:** cada vez que el usuario juega **10 minutos seguidos** suma una estrella. Cuentan los reintentos después de chocar; si deja de jugar más de 20 segundos o sale de la pantalla, vuelve a empezar. Se gana como máximo una estrella por pedido.
- **Control:** el servidor solo da la estrella si el pedido lleva al menos 10 minutos en camino. Se puede reclamar hasta 2 minutos después de la entrega.
- **Premio:** con **5 estrellas** el usuario gana **$2.500 de saldo a favor**, y las estrellas vuelven a 0. Es la única recompensa.
- **Cómo se usa:** el saldo a favor se descuenta solo del próximo pedido, sin pasarse del total. Si el usuario cancela ese pedido, lo recupera.
- **Quién lo paga:** sale de la ganancia de FreeDeli, no del kiosco ni del rider. El cliente transfiere menos al kiosco, y al liberarse el pago FreeDeli le acredita esa diferencia en su saldo prepago.

### Un pedido a la vez

El usuario puede tener un solo pedido abierto. Mientras tenga uno en curso, PEDIR lo lleva al seguimiento.

Navegación inferior: Inicio · Pedir · Mi pedido · Ajustes.

**Ajustes:** nombre y apellido, DNI, email y teléfono, y cerrar sesión. El DNI se pide también al crear la cuenta.

Diseño de referencia: canvas, página "App Usuario".
