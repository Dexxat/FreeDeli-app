import { boton, expect, ingresar, test, urlApp } from './soporte/fixtures.js';
import { archivoFoto, unico } from './soporte/api.js';
import { DEV } from '../entorno/config.mjs';

test.describe('cuentas y sesiones', () => {
  test('un usuario se registra desde la app y queda adentro', async ({ abrir }) => {
    const usuario = await abrir('usuarios');
    await usuario.waitForURL(/\/ingresar$/);
    await usuario.getByRole('link', { name: 'Crear cuenta' }).click();
    const email = `nuevo-${unico()}@e2e.local`;
    await usuario.locator('input[name=nombre]').fill('Sofía Gómez');
    await usuario.locator('input[name=dni]').fill('40.111.999');
    await usuario.locator('input[name=telefono]').fill('11 5555-0111');
    await usuario.locator('input[name=email]').fill(email);
    await usuario.locator('input[name=clave]').fill('claveUsuario1');
    await usuario.locator('input[name=direccion]').fill('Pringles 210');
    await usuario.locator('select[name=zona]').selectOption('muniz');
    await boton(usuario, 'CREAR CUENTA').click();
    await usuario.waitForURL(/\/inicio$/);
    await expect(usuario.getByText('Hola, Sofía')).toBeVisible();
    await expect(usuario.getByText('Pringles 210')).toBeVisible();

    // La sesión sobrevive a recargar la página.
    await usuario.reload();
    await expect(usuario.getByText('Hola, Sofía')).toBeVisible();
  });

  test('el usuario edita sus datos en Ajustes y entra con el email nuevo', async ({ api, abrir }) => {
    const u = await api.usuario();
    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/ajustes`);
    const nombre = usuario.getByLabel('Nombre y apellido');
    await expect(nombre).toHaveValue('Martina Rodríguez');
    await expect(usuario.getByLabel('DNI')).toHaveValue('40111222');
    await nombre.fill('Martina Gómez');
    const nuevoEmail = `cambiado-${unico()}@e2e.local`;
    await usuario.getByLabel('Email').fill(nuevoEmail);
    await boton(usuario, 'GUARDAR').click();
    await expect(usuario.getByText('Datos guardados.')).toBeVisible();

    // El email de otra cuenta no se puede tomar.
    const otro = await api.usuario();
    await usuario.getByLabel('Email').fill(otro.email);
    await boton(usuario, 'GUARDAR').click();
    await expect(usuario.getByRole('alert')).toHaveText('Ya hay una cuenta con ese email.');

    await boton(usuario, 'Cerrar sesión').click();
    await ingresar(usuario, nuevoEmail, u.clave, /\/inicio$/);
    await expect(usuario.getByText('Hola, Martina')).toBeVisible();
  });

  test('errores al ingresar', async ({ api, abrir }) => {
    const u = await api.usuario();
    const r = await api.rider();
    const usuario = await abrir('usuarios');
    await usuario.waitForURL(/\/ingresar$/);
    await boton(usuario, 'INGRESAR').click();
    await expect(usuario.getByRole('alert')).toHaveText('Completá el email y la contraseña.');
    await usuario.locator('input[name=email]').fill(u.email);
    await usuario.locator('input[name=clave]').fill('claveEquivocada');
    await boton(usuario, 'INGRESAR').click();
    await expect(usuario.getByRole('alert')).toHaveText('Email o contraseña incorrectos.');
    // Una cuenta de rider no entra a la app de usuarios.
    await usuario.locator('input[name=email]').fill(r.email);
    await usuario.locator('input[name=clave]').fill(r.clave);
    await boton(usuario, 'INGRESAR').click();
    await expect(usuario.getByRole('alert')).toHaveText('Esta cuenta es de otra app de FreeDeli.');
    await expect(usuario).toHaveURL(/\/ingresar$/);
  });

  test('sin sesión, las rutas privadas llevan al ingreso', async ({ abrir }) => {
    for (const [app, ruta] of [['usuarios', '/pedir'], ['kioscos', '/ganancias'], ['riders', '/vivo'], ['dev', '/entregas']] as const) {
      const page = await abrir(app);
      await page.goto(`${urlApp(app)}${ruta}`);
      await expect(page, `${app}${ruta}`).toHaveURL(/\/ingresar$/);
    }
  });

  test('alta de kiosco: pide el alta, Dev la aprueba desde el panel y el kiosco entra', async ({ abrir }) => {
    const dev = await abrir('dev');
    await ingresar(dev, DEV.email, DEV.clave, /\/main$/);

    const kiosco = await abrir('kioscos');
    await kiosco.waitForURL(/\/ingresar$/);
    await kiosco.getByRole('link', { name: 'Crear cuenta' }).click();
    const nombre = `Drugstore ${unico().slice(-5)}`;
    await kiosco.locator('input[name=nombre]').fill(nombre);
    await kiosco.locator('input[name=direccion]').fill('Senador Morón 1210');
    await kiosco.locator('select[name=zona]').selectOption('bella-vista');
    await kiosco.locator('input[name=aliasCobro]').fill('drugstore.e2e');
    await kiosco.locator('input[name=email]').fill(`alta-${unico()}@e2e.local`);
    await kiosco.locator('input[name=clave]').fill('claveKiosco1');
    await boton(kiosco, 'PEDIR ALTA').click();
    await expect(kiosco.getByText('ESPERANDO APROBACIÓN')).toBeVisible();

    // Aparece en vivo en el panel de Dev.
    const alta = dev.getByRole('region', { name: /ALTAS PENDIENTES/ }).locator('li', { hasText: nombre });
    await expect(alta).toBeVisible();
    await boton(alta, 'Aprobar').click();
    await expect(alta).toHaveCount(0);

    await boton(kiosco, 'YA ME APROBARON').click();
    await kiosco.waitForURL(/\/inicio$/);
    await expect(kiosco.getByText(nombre).first()).toBeVisible();
  });

  test('alta de rider rechazada: el rider lo ve y no puede operar', async ({ api, abrir }) => {
    const dev = await abrir('dev');
    await ingresar(dev, DEV.email, DEV.clave, /\/main$/);
    const rider = await abrir('riders');
    await rider.waitForURL(/\/ingresar$/);
    await rider.getByRole('link', { name: 'Crear cuenta' }).click();
    const nombre = `Rider Rechazado ${unico().slice(-4)}`;
    const email = `rechazo-${unico()}@e2e.local`;
    for (const [n, v] of [['nombre', nombre], ['telefono', '11 5555-0333'], ['dni', '40111222'], ['email', email], ['clave', 'claveRider1'], ['vehiculoModelo', 'Honda Wave 110'], ['patente', 'A777BCD'], ['aliasCbu', 'rider.rechazado']]) {
      await rider.locator(`input[name=${n}]`).fill(v);
    }
    // Sin las fotos no deja pedir el alta.
    await boton(rider, 'PEDIR ALTA').click();
    await expect(rider.getByRole('alert')).toHaveText('Subí la foto del seguro y la de la licencia.');
    await rider.getByLabel('Foto: Seguro de la moto').setInputFiles(archivoFoto('seguro.png'));
    await rider.getByLabel('Foto: Licencia de conducir').setInputFiles(archivoFoto('licencia.png'));
    await expect(rider.getByRole('img', { name: 'Foto: Seguro de la moto' })).toBeVisible();
    await expect(rider.getByRole('img', { name: 'Foto: Licencia de conducir' })).toBeVisible();
    await boton(rider, 'PEDIR ALTA').click();
    await expect(rider.getByText('ESPERANDO APROBACIÓN')).toBeVisible();

    const alta = dev.getByRole('region', { name: /ALTAS PENDIENTES/ }).locator('li', { hasText: nombre });
    // Dev ve las dos fotos antes de decidir, comprimidas a JPEG por la app.
    await expect(alta.getByRole('img', { name: 'Seguro de la moto' })).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
    await expect(alta.getByRole('img', { name: 'Licencia de conducir' })).toBeVisible();
    await boton(alta, 'Rechazar').click();
    await expect(alta).toHaveCount(0);
    await boton(rider, 'YA ME APROBARON').click();
    await expect(rider.getByText('ALTA NO APROBADA')).toBeVisible();
    const token = await api.ingresar(email, 'claveRider1');
    expect((await api.cruda('PATCH', '/rider/estado', { disponible: true, zonas: ['muniz'] }, token)).status()).toBe(403);
  });

  test('al recargar en medio de un pedido, la app retoma el estado y sigue en vivo', async ({ api, abrir }) => {
    const k = await api.kiosco();
    const u = await api.usuario();
    const p = await api.pedido(u.token, k);
    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedido/${p.id}`);
    await expect(usuario.getByText('REVISANDO STOCK')).toBeVisible();
    await usuario.reload();
    await expect(usuario.getByText('REVISANDO STOCK')).toBeVisible();
    // Después de recargar, los cambios siguen llegando solos.
    await api.llamar('POST', `/kiosco/pedidos/${p.id}/stock`, { faltantes: [] }, k.token);
    await expect(usuario.getByText('PAGO POR TRANSFERENCIA')).toBeVisible();
    await api.llamar('POST', `/kiosco/pedidos/${p.id}/transferencia`, {}, k.token);
    await expect(usuario.getByText('BUSCANDO RIDER')).toBeVisible();
  });
});
