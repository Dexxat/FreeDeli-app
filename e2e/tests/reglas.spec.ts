import { boton, expect, ingresar, test, urlApp } from './soporte/fixtures.js';
import { DEV } from '../entorno/config.mjs';
import { GPS_CLIENTE } from './soporte/api.js';

test.describe('reglas de negocio', () => {
  test('pedido mínimo de $15.000 en productos', async ({ api, abrir }) => {
    const k = await api.kiosco();
    const u = await api.usuario();
    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedir/${k.id}`);
    for (let i = 0; i < 5; i++) await usuario.getByLabel('Agregar Coca-Cola 1,5 L').click();
    await expect(usuario.locator('.minimo')).toContainText('Te faltan $1.000');
    await expect(boton(usuario, 'HACER PEDIDO')).toBeDisabled();
    await usuario.getByLabel('Agregar Coca-Cola 1,5 L').click();
    await expect(usuario.locator('.minimo')).toHaveCount(0);
    await expect(boton(usuario, 'HACER PEDIDO')).toBeEnabled();

    // La API también lo exige, aunque se saltee la app.
    const r = await api.cruda('POST', '/pedidos', { kioscoId: k.id, items: [{ productoId: k.productos[0].id, cantidad: 5 }], ubicacion: GPS_CLIENTE }, u.token);
    expect(r.status()).toBe(409);
    expect(await r.json()).toMatchObject({ codigo: 'pedido-minimo' });
  });

  test('un solo pedido abierto por usuario', async ({ api, abrir }) => {
    const k = await api.kiosco();
    const u = await api.usuario();
    const p = await api.pedido(u.token, k);
    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedir/${k.id}`);
    await usuario.getByRole('link', { name: 'VER MI PEDIDO EN CURSO' }).click();
    await usuario.waitForURL(new RegExp(`/pedido/${p.id}$`));
    const r = await api.cruda('POST', '/pedidos', { kioscoId: k.id, items: [{ productoId: k.productos[0].id, cantidad: 6 }], ubicacion: GPS_CLIENTE }, u.token);
    expect(r.status()).toBe(409);
    expect(await r.json()).toMatchObject({ codigo: 'pedido-en-curso' });
  });

  test('un kiosco sin saldo para la comisión mínima no recibe pedidos', async ({ api, abrir }) => {
    const conSaldo = await api.kiosco({ zona: 'muniz' });
    const sinSaldo = await api.kiosco({ zona: 'muniz', saldo: 1000 });
    const u = await api.usuario({ zona: 'muniz' });
    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedir`);
    await expect(usuario.getByText(conSaldo.nombre)).toBeVisible();
    await expect(usuario.getByText(sinSaldo.nombre)).toHaveCount(0);
    const r = await api.cruda('POST', '/pedidos', { kioscoId: sinSaldo.id, items: [{ productoId: sinSaldo.productos[0].id, cantidad: 6 }], ubicacion: GPS_CLIENTE }, u.token);
    expect(await r.json()).toMatchObject({ codigo: 'kiosco-cerrado' });

    // El kiosco ve la alerta de saldo en su tablero.
    const kiosco = await abrir('kioscos');
    await ingresar(kiosco, sinSaldo.email, sinSaldo.clave, /\/inicio$/);
    await expect(kiosco.getByText('Cargá saldo para no quedarte sin pedidos')).toBeVisible();
  });

  test('Dev pausa un kiosco y deja de aparecer; al reactivarlo vuelve', async ({ api, abrir }) => {
    const k = await api.kiosco({ zona: 'bella-vista' });
    const u = await api.usuario({ zona: 'bella-vista' });
    const dev = await abrir('dev');
    await ingresar(dev, DEV.email, DEV.clave, /\/main$/);
    await dev.goto(`${urlApp('dev')}/kioscos/${k.id}`);
    await boton(dev, 'Pausar').click();
    await expect(boton(dev, 'Reactivar')).toBeVisible();

    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedir`);
    await expect(usuario.getByRole('heading', { name: 'KIOSCOS ABIERTOS' })).toBeVisible();
    await expect(usuario.getByText(k.nombre)).toHaveCount(0);

    await boton(dev, 'Reactivar').click();
    await expect(boton(dev, 'Pausar')).toBeVisible();
    await usuario.reload();
    await expect(usuario.getByText(k.nombre)).toBeVisible();
  });

  test('fuera del área de cobertura no se puede pedir', async ({ api, abrir }) => {
    const k = await api.kiosco();
    const u = await api.usuario();
    // El celular está al norte de la terminal de San Miguel, fuera del rombo.
    const usuario = await abrir('usuarios', { ubicacion: { lat: -34.52, lng: -58.7 } });
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedir/${k.id}`);
    for (let i = 0; i < 6; i++) await usuario.getByLabel('Agregar Coca-Cola 1,5 L').click();
    await boton(usuario, 'HACER PEDIDO').click();
    await expect(usuario.getByRole('alert')).toHaveText('Estás fuera del área donde entrega FreeDeli.');
    await expect(usuario).toHaveURL(new RegExp(`/pedir/${k.id}$`));
  });

  test('el envío: el rider cobra según el anillo de distancia y el cliente paga hasta $2.500', async ({ api }) => {
    const anillo = (km: number) => (km < 1.5 ? 3000 : km <= 3 ? 4000 : 5000);
    const k = await api.kiosco({ zona: 'san-miguel' });
    // El cliente pide desde el centro de cada zona: el envío se calcula hasta su GPS.
    const centros = { 'san-miguel': { lat: -34.542, lng: -58.7 }, muniz: { lat: -34.552, lng: -58.7 }, 'bella-vista': { lat: -34.563, lng: -58.694 } };
    for (const [zona, gps] of Object.entries(centros)) {
      const u = await api.usuario();
      const p = (await api.pedido(u.token, k, 'stock', undefined, gps)) as unknown as { distanciaKm: number; gananciaRider: number; costoEnvio: number };
      expect(p.gananciaRider, `${zona}, ${p.distanciaKm} km`).toBe(anillo(p.distanciaKm));
      expect(p.costoEnvio).toBe(Math.min(2500, p.gananciaRider));
    }
  });
});
