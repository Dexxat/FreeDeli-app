import { Api, Pedido } from './soporte/api.js';
import { sql } from './soporte/db.js';
import { boton, expect, ingresar, test, urlApp } from './soporte/fixtures.js';

const pesos = (n: number) => '$' + n.toLocaleString('es-AR');

/** Lleva un pedido hasta En camino y simula que salió hace `minutos`. */
async function pedidoEnCamino(api: Api, minutos: number) {
  const k = await api.kiosco({ zona: 'muniz' });
  const u = await api.usuario({ zona: 'muniz' });
  const r = await api.rider({ zona: 'muniz' });
  const p = await api.pedido(u.token, k, 'rider');
  await api.esperarOferta(r.token, p.id);
  await api.llamar('POST', `/rider/ofertas/${p.id}/aceptar`, {}, r.token);
  await api.llamar('POST', `/kiosco/pedidos/${p.id}/aprobar-rider`, { aprobado: true }, k.token);
  await api.llamar('POST', `/rider/pedidos/${p.id}/retiro`, {}, r.token);
  await api.llamar('POST', `/kiosco/pedidos/${p.id}/envio`, {}, k.token);
  await api.llamar('POST', `/rider/pedidos/${p.id}/en-camino`, {}, r.token);
  await sql(`UPDATE "Pedido" SET "enCaminoEn" = now() - make_interval(mins => $2) WHERE id = $1`, [p.id, minutos]);
  return { k, u, r, p };
}

test.describe('FREEDELI RUSH', () => {
  test('la usuaria juega 10 minutos seguidos mientras espera y suma una estrella', async ({ api, abrir }) => {
    test.setTimeout(120_000);
    const { u, p } = await pedidoEnCamino(api, 11);
    const usuario = await abrir('usuarios');
    await usuario.clock.install();
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedido/${p.id}`);
    await expect(usuario.getByRole('heading', { name: 'FREEDELI RUSH' })).toBeVisible();
    await expect(usuario.getByRole('img', { name: '0 de 5 estrellas' })).toBeVisible();

    // Juega: toca SALTAR cada 2 segundos (y reintenta si choca) durante 10 minutos de reloj simulado.
    // Cada salto de reloj corre el juego un paso: la racha mide tiempo de reloj, no pasos.
    for (let s = 0; s < 10 * 60 + 6; s += 2) {
      await boton(usuario, 'SALTAR').click();
      await usuario.clock.fastForward(2000);
    }
    await expect(usuario.getByText('¡Sumaste una estrella!')).toBeVisible();
    await expect(usuario.getByRole('img', { name: '1 de 5 estrellas' })).toBeVisible();
    expect((await api.llamar('GET', '/usuario/perfil', undefined, u.token)).estrellas).toBe(1);
  });

  test('con la quinta estrella gana $2.500: el próximo pedido sale más barato y FreeDeli se lo devuelve al kiosco', async ({ api, abrir }) => {
    const { u, k, r, p } = await pedidoEnCamino(api, 12);
    await sql(`UPDATE "Usuario" SET estrellas = 4 WHERE "cuentaId" = (SELECT id FROM "Cuenta" WHERE email = $1)`, [u.email]);
    expect(await api.llamar('POST', `/pedidos/${p.id}/estrella`, {}, u.token)).toEqual({ estrellas: 0, saldoFavor: 2500, premio: true });
    await api.llamar('POST', `/rider/pedidos/${p.id}/entregar`, { pin: p.pin }, r.token);

    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await expect(usuario.getByText(`Tenés ${pesos(2500)} a favor`)).toBeVisible();
    await usuario.goto(`${urlApp('usuarios')}/pedir/${k.id}`);
    for (let i = 0; i < 6; i++) await usuario.getByLabel('Agregar Coca-Cola 1,5 L').click();
    await expect(usuario.locator('.total')).toHaveText(pesos(16_800 + 2500 - 2500));
    await expect(usuario.getByText(`Incluye ${pesos(2500)} de saldo a favor.`)).toBeVisible();
    await boton(usuario, 'HACER PEDIDO').click();
    await usuario.waitForURL(/\/realizado$/);
    const nuevoId = usuario.url().split('/pedido/')[1].split('/')[0];
    const nuevo = await api.llamar<Pedido & { descuentoPremio: number }>('GET', `/pedidos/${nuevoId}`, undefined, u.token);
    expect(nuevo.descuentoPremio).toBe(2500);

    const kiosco = await abrir('kioscos');
    await ingresar(kiosco, k.email, k.clave, /\/inicio$/);
    await expect(kiosco.locator('article', { hasText: `#A-${nuevo.numero}` })).toContainText(`El cliente usó ${pesos(2500)} de saldo a favor`);
  });
});
