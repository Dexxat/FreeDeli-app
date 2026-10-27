import { boton, expect, ingresar, test, urlApp } from './soporte/fixtures.js';
import { DEV } from '../entorno/config.mjs';

const pesos = (n: number) => '$' + n.toLocaleString('es-AR');

test.describe('panel Dev', () => {
  test('acredita una carga de saldo y el kiosco la ve', async ({ api, abrir }) => {
    const k = await api.kiosco({ saldo: 0 });
    const dev = await abrir('dev');
    await ingresar(dev, DEV.email, DEV.clave, /\/main$/);
    await dev.goto(`${urlApp('dev')}/kioscos/${k.id}`);
    await dev.locator('input[name=monto]').fill('25000');
    await dev.locator('input[name=referencia]').fill('Op. 777');
    await boton(dev, 'Acreditar carga').click();
    await expect(dev.getByRole('cell', { name: 'Op. 777' })).toBeVisible();

    const kiosco = await abrir('kioscos');
    await ingresar(kiosco, k.email, k.clave, /\/inicio$/);
    await expect(kiosco.getByText(pesos(25_000)).first()).toBeVisible();
    expect((await api.llamar('GET', '/kiosco/saldo', undefined, k.token)).saldo ?? (await api.llamar('GET', '/kiosco', undefined, k.token)).saldo).toBe(25_000);
  });

  test('una carga inválida se rechaza', async ({ api, abrir }) => {
    const k = await api.kiosco({ saldo: 0 });
    const dev = await abrir('dev');
    await ingresar(dev, DEV.email, DEV.clave, /\/main$/);
    await dev.goto(`${urlApp('dev')}/kioscos/${k.id}`);
    await dev.locator('input[name=monto]').fill('-500');
    await boton(dev, 'Acreditar carga').click();
    await expect(dev.getByRole('alert')).toContainText('mayor a cero');
    // La API tampoco lo acepta si se la llama directo.
    const r = await api.cruda('POST', `/admin/kioscos/${k.id}/saldo`, { monto: -500 }, await api.dev());
    expect(r.status()).toBe(400);
    expect((await api.llamar('GET', '/kiosco', undefined, k.token)).saldo).toBe(0);
  });

  test('las ganancias suman la comisión de cada entrega y se registra un conflicto', async ({ api, abrir }) => {
    const dev = await api.dev();
    const antes = (await api.llamar('GET', '/admin/ganancias?periodo=jornada', undefined, dev)).total;
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
    await api.llamar('POST', `/rider/pedidos/${p.id}/entregar`, { pin: p.pin }, r.token);
    const despues = (await api.llamar('GET', '/admin/ganancias?periodo=jornada', undefined, dev)).total;
    expect(despues - antes).toBe(p.comisionFreeDeli);

    const panel = await abrir('dev');
    await ingresar(panel, DEV.email, DEV.clave, /\/main$/);
    const fila = panel.locator('.filas li', { hasText: `#A-${p.numero}` });
    await expect(fila).toHaveClass(/estado-entregado/);
    await fila.getByRole('button', { name: `Reportar conflicto en #A-${p.numero}` }).click();
    const dialogo = panel.locator('dialog[open]');
    await dialogo.locator('textarea').fill('La clienta reclama una gaseosa caliente.');
    await boton(dialogo, 'Registrar').click();
    await expect(panel.getByText('La clienta reclama una gaseosa caliente.')).toBeVisible();

    await panel.getByRole('link', { name: 'GANANCIAS' }).click();
    await expect(panel.locator('.total-monto')).toHaveText(pesos(despues));
    await panel.getByRole('link', { name: 'ENTREGAS' }).click();
    await expect(panel.getByText(`#A-${p.numero}`)).toBeVisible();
  });
});
