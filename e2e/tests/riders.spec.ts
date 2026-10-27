import { boton, expect, ingresar, test } from './soporte/fixtures.js';

test.describe('reparto de ofertas entre riders', () => {
  test('rechazar una oferta no penaliza al rider y el pedido pasa a otro', async ({ api, abrir }) => {
    const k = await api.kiosco({ zona: 'muniz' });
    const u = await api.usuario({ zona: 'muniz' });
    const a = await api.rider({ zona: 'muniz' });

    const rider = await abrir('riders');
    await ingresar(rider, a.email, a.clave, /\/inicio$/);
    const p = await api.pedido(u.token, k, 'rider');
    const oferta = rider.getByRole('alertdialog');
    await expect(oferta).toBeVisible({ timeout: 25_000 });
    await expect(oferta).toContainText('¡PEDIDO NUEVO!');
    await boton(oferta, 'Rechazar').click();
    await expect(oferta).toBeHidden();

    // Sin penalidad: sigue conectado y sin pausa.
    const perfil = await api.llamar('GET', '/rider', undefined, a.token);
    expect(perfil).toMatchObject({ disponible: true, pausado: false });

    // Se conecta otro rider y el pedido le llega a él.
    const b = await api.rider({ zona: 'muniz' });
    await api.esperarOferta(b.token, p.id);
    expect(await api.llamar('GET', '/rider/oferta', undefined, a.token)).toBeFalsy();
  });

  test('si el kiosco rechaza al rider, se busca otro y al primero no se le vuelve a ofrecer', async ({ api, abrir }) => {
    const k = await api.kiosco({ zona: 'bella-vista' });
    const u = await api.usuario({ zona: 'bella-vista' });
    const a = await api.rider({ zona: 'bella-vista', nombre: 'Primer Rider' });
    const kiosco = await abrir('kioscos');
    await ingresar(kiosco, k.email, k.clave, /\/inicio$/);
    const rider = await abrir('riders');
    await ingresar(rider, a.email, a.clave, /\/inicio$/);
    const p = await api.pedido(u.token, k, 'rider');
    const oferta = rider.getByRole('alertdialog');
    await expect(oferta).toBeVisible({ timeout: 25_000 });
    await boton(oferta, 'ACEPTAR').click();
    await rider.waitForURL(/\/vivo$/);

    const tarjeta = kiosco.locator('article', { hasText: `#A-${p.numero}` });
    await expect(tarjeta).toContainText('Primer Rider');
    await boton(tarjeta, 'Rechazar').click();
    await expect(tarjeta).not.toContainText('Primer Rider');
    await expect(rider.getByText(`El kiosco eligió otro rider para el pedido #A-${p.numero}`)).toBeVisible();

    const b = await api.rider({ zona: 'bella-vista' });
    await api.esperarOferta(b.token, p.id);
    const pedido = await api.llamar('GET', `/pedidos/${p.id}`, undefined, u.token);
    expect(pedido.fase).toBe('rider');
    expect(await api.llamar('GET', '/rider/oferta', undefined, a.token)).toBeFalsy();
  });

  test('si la oferta vence sin respuesta, se le ofrece al siguiente', async ({ api, abrir }) => {
    const k = await api.kiosco({ zona: 'san-miguel' });
    const u = await api.usuario({ zona: 'san-miguel' });
    const a = await api.rider({ zona: 'san-miguel' });
    const rider = await abrir('riders');
    await ingresar(rider, a.email, a.clave, /\/inicio$/);
    const p = await api.pedido(u.token, k, 'rider');
    await expect(rider.getByRole('alertdialog')).toBeVisible({ timeout: 25_000 });

    const b = await api.rider({ zona: 'san-miguel' });
    // La oferta dura 15 s en el entorno de pruebas; el barrido corre cada 5 s.
    await api.esperarOferta(b.token, p.id, 40);
    await expect(rider.getByRole('alertdialog')).toBeHidden();
  });
});
