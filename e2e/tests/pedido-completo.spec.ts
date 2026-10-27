import { Page } from '@playwright/test';
import { boton, expect, ingresar, test, urlApp } from './soporte/fixtures.js';
import { DEV } from '../entorno/config.mjs';

const pesos = (n: number) => '$' + n.toLocaleString('es-AR');

/** Tarjeta de un pedido en el tablero en vivo del kiosco. */
const tarjeta = (kiosco: Page, numero: number) => kiosco.locator('article', { hasText: `#A-${numero}` });

test('un pedido completo, con las cuatro apps abiertas a la vez', async ({ api, abrir }) => {
  const k = await api.kiosco({ zona: 'san-miguel', productos: [['Coca-Cola 1,5 L', 2800]] });
  const u = await api.usuario({ zona: 'san-miguel' });
  const r = await api.rider({ nombre: 'Lucas Romero' });
  const saldoInicial = 20_000;

  // Los cuatro actores entran desde sus apps.
  const usuario = await abrir('usuarios');
  await ingresar(usuario, u.email, u.clave, /\/inicio$/);
  const kiosco = await abrir('kioscos');
  await ingresar(kiosco, k.email, k.clave, /\/inicio$/);
  await expect(kiosco.getByText(pesos(saldoInicial)).first()).toBeVisible();
  const rider = await abrir('riders');
  await ingresar(rider, r.email, r.clave, /\/inicio$/);
  const dev = await abrir('dev');
  await ingresar(dev, DEV.email, DEV.clave, /\/main$/);

  // El rider elige San Miguel y se conecta.
  const zona = rider.locator('button.zona', { hasText: 'San Miguel' });
  if ((await zona.getAttribute('aria-pressed')) !== 'true') await zona.click();
  await expect(zona).toHaveAttribute('aria-pressed', 'true');
  await rider.locator('button.interruptor').click();
  await expect(rider.locator('button.interruptor')).toHaveAttribute('aria-pressed', 'true');

  // El usuario arma el pedido: 6 Coca-Cola = $16.800 + envío con tope $2.500.
  await usuario.goto(`${urlApp('usuarios')}/pedir/${k.id}`);
  await expect(usuario.getByRole('heading', { name: k.nombre })).toBeVisible();
  for (let i = 0; i < 6; i++) await usuario.getByLabel('Agregar Coca-Cola 1,5 L').click();
  await expect(usuario.locator('.resumen')).toContainText('6 productos + envío $2.500');
  await expect(usuario.locator('.total')).toHaveText(pesos(16_800 + 2_500));
  await boton(usuario, 'HACER PEDIDO').click();
  await usuario.waitForURL(/\/pedido\/[^/]+\/realizado$/);
  const pedidoId = usuario.url().split('/pedido/')[1].split('/')[0];
  await expect(usuario.getByText('REVISANDO STOCK')).toBeVisible();
  const pedido = await api.llamar('GET', `/pedidos/${pedidoId}`, undefined, u.token);
  expect(pedido).toMatchObject({ costoEnvio: 2500, gananciaRider: 3000, comisionFreeDeli: 1680 });

  // Llega en vivo al kiosco y a MAIN.
  await expect(tarjeta(kiosco, pedido.numero)).toBeVisible();
  await expect(dev.locator('.filas li', { hasText: `#A-${pedido.numero}` })).toBeVisible();

  // Kiosco: tiene todo. El usuario ve a quién transferir.
  await boton(tarjeta(kiosco, pedido.numero), 'TENGO TODO').click();
  await expect(usuario.getByText('PAGO POR TRANSFERENCIA')).toBeVisible();
  await expect(usuario.locator('.alias-valor')).toHaveText(k.alias);
  await expect(usuario.getByText(`Transferí ${pesos(19_300)}`)).toBeVisible();

  // Kiosco confirma la transferencia: se busca rider y le llega la oferta.
  await expect(tarjeta(kiosco, pedido.numero)).toContainText(`El cliente tiene que transferirte ${pesos(19_300)}`);
  await boton(tarjeta(kiosco, pedido.numero), 'TRANSFERENCIA RECIBIDA').click();
  await expect(usuario.getByText('BUSCANDO RIDER')).toBeVisible();
  const oferta = rider.getByRole('alertdialog');
  await expect(oferta).toBeVisible({ timeout: 25_000 });
  await expect(oferta).toContainText(pesos(3000));
  await expect(oferta).toContainText(k.nombre);
  await oferta.getByRole('button', { name: 'ACEPTAR' }).click();
  await rider.waitForURL(/\/vivo$/);
  await expect(rider.getByText('Esperando que el kiosco te confirme')).toBeVisible();
  await expect(usuario.getByText('RIDER ENCONTRADO')).toBeVisible();

  // El kiosco ve al rider y lo aprueba.
  await expect(tarjeta(kiosco, pedido.numero)).toContainText('Lucas Romero');
  await boton(tarjeta(kiosco, pedido.numero), 'APROBAR RIDER').click();

  // Retiro: confirman los dos.
  await boton(rider, 'YA LO RETIRÉ').click();
  await expect(rider.getByText('Falta que el kiosco confirme el envío')).toBeVisible();
  await boton(tarjeta(kiosco, pedido.numero), 'CONFIRMAR ENVÍO').click();
  await boton(rider, 'SALGO EN CAMINO').click();
  await expect(dev.locator('.filas li.estado-en-camino', { hasText: `#A-${pedido.numero}` })).toBeVisible();

  // El usuario ve el seguimiento con su PIN.
  await usuario.goto(`${urlApp('usuarios')}/pedido/${pedidoId}`);
  await expect(usuario.locator('.pin-digitos')).toHaveAttribute('aria-label', `PIN ${pedido.pin.split('').join(' ')}`);
  await expect(usuario.getByText('Lucas R.')).toBeVisible();

  // Un PIN equivocado no cierra el pedido.
  const equivocado = pedido.pin === '1111' ? '2222' : '1111';
  await rider.getByLabel('Dígito 1 del PIN').click();
  await rider.keyboard.type(equivocado);
  await boton(rider, 'CONFIRMAR ENTREGA').click();
  await expect(rider.locator('.pin-error')).toBeVisible();
  expect((await api.llamar('GET', `/pedidos/${pedidoId}`, undefined, u.token)).estado).toBe('en-camino');

  // Con el PIN correcto se entrega.
  await rider.getByLabel('Dígito 1 del PIN').click();
  for (let i = 0; i < 4; i++) await rider.keyboard.press('Backspace');
  await rider.getByLabel('Dígito 1 del PIN').click();
  await rider.keyboard.type(pedido.pin);
  await boton(rider, 'CONFIRMAR ENTREGA').click();
  await expect(rider.getByText('¡ENTREGADO!')).toBeVisible();
  await expect(usuario.getByText('¡ENTREGADO!')).toBeVisible();
  await expect(usuario.getByText(`Total pagado`)).toBeVisible();

  // El dinero: comisión descontada del saldo, MAIN y GANANCIAS al día.
  await expect(kiosco.getByText(pesos(saldoInicial - 1680)).first()).toBeVisible();
  const fila = dev.locator('.filas li.estado-entregado', { hasText: `#A-${pedido.numero}` });
  await expect(fila).toBeVisible();
  await expect(fila).toContainText(`${pesos(3000)}`);
  // Neto del kiosco: cobró 19.300, pagó 3.000 al rider y 1.680 de comisión.
  await expect(fila).toContainText(pesos(19_300 - 3000 - 1680));
  await dev.getByRole('link', { name: 'ENTREGAS' }).click();
  const entrega = dev.locator('li, article, tr', { hasText: `#A-${pedido.numero}` }).first();
  await expect(entrega).toBeVisible();
});
