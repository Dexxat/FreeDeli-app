import { boton, expect, ingresar, test, urlApp } from './soporte/fixtures.js';
import { DEV } from '../entorno/config.mjs';
import type { Api } from './soporte/api.js';

const pesos = (n: number) => '$' + n.toLocaleString('es-AR');

test.describe('incidentes', () => {
  test('el cliente cancela un pedido pagado y el kiosco le devuelve el dinero', async ({ api, abrir }) => {
    const k = await api.kiosco();
    const u = await api.usuario();
    const p = await api.pedido(u.token, k, 'rider');

    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedido/${p.id}`);
    await expect(usuario.getByText('BUSCANDO RIDER')).toBeVisible();
    await boton(usuario, 'Cancelar pedido').click();
    await expect(usuario.getByText(`PEDIDO #A-${p.numero} CANCELADO`)).toBeVisible();

    const { cancelacion } = await api.llamar('GET', `/pedidos/${p.id}`, undefined, u.token);
    expect(cancelacion).toMatchObject({ motivo: 'cliente', riderCobra: false });
    await expect(usuario.getByText(`El kiosco te devuelve ${pesos(cancelacion.reintegro)} a la cuenta desde la que transferiste.`)).toBeVisible();

    const kiosco = await abrir('kioscos');
    await ingresar(kiosco, k.email, k.clave, /\/inicio$/);
    const tarjeta = kiosco.locator('article', { hasText: `#A-${p.numero}` });
    await expect(tarjeta).toContainText(`Devolvele ${pesos(cancelacion.reintegro)} al cliente`);
    await boton(tarjeta, 'YA LO DEVOLVÍ').click();
    await expect(tarjeta).toHaveCount(0);
    await expect(usuario.getByText(`El kiosco ya te devolvió ${pesos(cancelacion.reintegro)}.`)).toBeVisible();
  });

  test('Dev cancela porque el rider no fue y marca entregado sin PIN', async ({ api, abrir }) => {
    const k = await api.kiosco({ zona: 'muniz', direccion: 'Av. Ricchieri 455' });
    const r = await api.rider({ zona: 'muniz' });
    const noFue = await pedidoAceptado(api, k, r.token, (await api.usuario({ zona: 'muniz' })).token);

    const dev = await abrir('dev');
    await ingresar(dev, DEV.email, DEV.clave, /\/main$/);
    const fila = (numero: number) => dev.locator('.filas li', { hasText: `#A-${numero}` });
    await boton(fila(noFue.numero), 'El rider no fue').click();
    await expect(fila(noFue.numero)).toHaveClass(/estado-cancelado/);
    expect((await api.llamar('GET', `/admin/riders/${noFue.riderId}`, undefined, await api.dev())).abandonos).toBe(1);

    const sinPin = await pedidoAceptado(api, k, r.token, (await api.usuario({ zona: 'muniz' })).token);
    await api.llamar('POST', `/rider/pedidos/${sinPin.id}/retiro`, {}, r.token);
    await api.llamar('POST', `/kiosco/pedidos/${sinPin.id}/envio`, {}, k.token);
    await api.llamar('POST', `/rider/pedidos/${sinPin.id}/en-camino`, {}, r.token);
    await boton(fila(sinPin.numero), 'Entregado sin PIN').click();
    await expect(fila(sinPin.numero)).toHaveClass(/estado-entregado/);
  });
});

/** Pedido pagado que el rider aceptó y el kiosco aprobó. */
async function pedidoAceptado(api: Api, k: Awaited<ReturnType<Api['kiosco']>>, riderToken: string, usuarioToken: string) {
  const p = await api.pedido(usuarioToken, k, 'rider');
  await api.esperarOferta(riderToken, p.id);
  await api.llamar('POST', `/rider/ofertas/${p.id}/aceptar`, {}, riderToken);
  return api.llamar<{ id: string; numero: number; riderId: string }>('POST', `/kiosco/pedidos/${p.id}/aprobar-rider`, { aprobado: true }, k.token);
}
