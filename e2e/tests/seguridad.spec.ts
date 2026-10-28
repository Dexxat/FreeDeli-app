import { expect, ingresar, test, urlApp } from './soporte/fixtures.js';
import { GPS_CLIENTE, unico } from './soporte/api.js';

test.describe('seguridad de la API', () => {
  test('sin sesión no se accede a nada privado', async ({ api }) => {
    for (const ruta of ['/usuario/perfil', '/kiosco', '/rider', '/admin/resumen', '/cuentas/pendientes', '/pedidos/en-curso', '/eventos']) {
      const r = await api.cruda('GET', ruta);
      expect(r.status(), ruta).toBe(401);
    }
    expect((await api.cruda('GET', '/salud')).status()).toBe(200);
    expect((await api.cruda('GET', '/horario')).status()).toBe(200);
  });

  test('un token adulterado o vencido no sirve', async ({ api }) => {
    const u = await api.usuario();
    const [cabecera, cuerpo] = u.token.split('.');
    const falso = `${cabecera}.${Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(cuerpo, 'base64url').toString()), rol: 'DEV' })).toString('base64url')}.firma`;
    expect((await api.cruda('GET', '/admin/resumen', undefined, falso)).status()).toBe(401);
    expect((await api.cruda('GET', '/usuario/perfil', undefined, 'basura')).status()).toBe(401);
  });

  test('cada rol solo usa su parte de la API', async ({ api }) => {
    const u = await api.usuario();
    const k = await api.kiosco();
    const r = await api.rider();
    const casos: [string, string, 'GET' | 'POST', string, unknown?][] = [
      ['usuario', u.token, 'GET', '/kiosco'],
      ['usuario', u.token, 'GET', '/rider'],
      ['usuario', u.token, 'GET', '/admin/resumen'],
      ['usuario', u.token, 'GET', '/cuentas/pendientes'],
      ['kiosco', k.token, 'POST', '/pedidos', { kioscoId: k.id, items: [] }],
      ['kiosco', k.token, 'GET', '/admin/resumen'],
      ['kiosco', k.token, 'POST', `/admin/kioscos/${k.id}/saldo`, { monto: 999_999 }],
      ['rider', r.token, 'GET', '/kiosco'],
      ['rider', r.token, 'GET', '/admin/kioscos'],
    ];
    for (const [rol, token, metodo, ruta, cuerpo] of casos) {
      expect((await api.cruda(metodo, ruta, cuerpo, token)).status(), `${rol} → ${metodo} ${ruta}`).toBe(403);
    }
  });

  test('una cuenta pendiente de aprobación no puede operar', async ({ api }) => {
    const email = `pendiente-${unico()}@e2e.local`;
    await api.llamar('POST', '/auth/registro/kiosco', { email, clave: 'claveKiosco1', nombre: 'Kiosco Pendiente', direccion: 'Paunero 1500', zona: 'san-miguel', aliasCobro: 'kiosco.pendiente' });
    const token = await api.ingresar(email, 'claveKiosco1');
    expect((await api.cruda('GET', '/auth/yo', undefined, token)).status()).toBe(200);
    expect((await api.cruda('GET', '/kiosco', undefined, token)).status()).toBe(403);
    expect((await api.cruda('POST', '/kiosco/productos', { nombre: 'X', precio: 100 }, token)).status()).toBe(403);
  });

  test('nadie toca pedidos ajenos', async ({ api }) => {
    const k = await api.kiosco();
    const otroKiosco = await api.kiosco();
    const u = await api.usuario();
    const otroUsuario = await api.usuario();
    const r = await api.rider();
    const p = await api.pedido(u.token, k);

    expect((await api.cruda('GET', `/pedidos/${p.id}`, undefined, otroUsuario.token)).status()).toBe(404);
    expect((await api.cruda('POST', `/pedidos/${p.id}/cancelar`, {}, otroUsuario.token)).status()).toBe(404);
    expect((await api.cruda('POST', `/kiosco/pedidos/${p.id}/stock`, { faltantes: [] }, otroKiosco.token)).status()).toBe(404);
    expect([404, 409]).toContain((await api.cruda('POST', `/rider/pedidos/${p.id}/entregar`, { pin: p.pin }, r.token)).status());
    expect((await api.cruda('POST', `/rider/ofertas/${p.id}/aceptar`, {}, r.token)).status()).not.toBe(200);
    expect((await api.llamar('GET', `/pedidos/${p.id}`, undefined, u.token)).estado).toBe('esperando');
  });

  test('la API valida los datos de entrada', async ({ api }) => {
    const k = await api.kiosco();
    const u = await api.usuario();
    const malos: unknown[] = [
      { kioscoId: k.id, items: [{ productoId: k.productos[0].id, cantidad: -6 }], ubicacion: GPS_CLIENTE },
      { kioscoId: k.id, items: [{ productoId: k.productos[0].id, cantidad: 1.5 }], ubicacion: GPS_CLIENTE },
      { kioscoId: 'no-es-un-id', items: [{ productoId: k.productos[0].id, cantidad: 6 }], ubicacion: GPS_CLIENTE },
      { kioscoId: k.id, items: 'todo', ubicacion: GPS_CLIENTE },
      { kioscoId: k.id, items: [{ productoId: k.productos[0].id, cantidad: 6 }], ubicacion: GPS_CLIENTE, precio: 1 },
      { kioscoId: k.id, items: [{ productoId: k.productos[0].id, cantidad: 6 }], ubicacion: { lat: 'cerca', lng: 0 } },
    ];
    for (const cuerpo of malos) {
      const r = await api.cruda('POST', '/pedidos', cuerpo, u.token);
      expect(r.status(), JSON.stringify(cuerpo)).toBe(400);
    }
    const registro = await api.cruda('POST', '/auth/registro/usuario', { email: 'no-es-email', clave: '123', nombre: '', telefono: '', direccion: '', zona: 'marte' });
    expect(registro.status()).toBe(400);
  });

  test('los textos de los usuarios se muestran como texto, nunca como HTML', async ({ api, abrir }) => {
    const ataque = `<img src=x onerror="window.__xss=1">Kiosco ${unico().slice(-4)}`;
    await api.kiosco({ zona: 'muniz', nombre: ataque });
    const u = await api.usuario({ zona: 'muniz' });
    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedir`);
    await expect(usuario.getByText(ataque)).toBeVisible();
    expect(await usuario.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
    expect(await usuario.locator('img[src=x]').count()).toBe(0);
  });
});
