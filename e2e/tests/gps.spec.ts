import { boton, expect, ingresar, test, urlApp } from './soporte/fixtures.js';
import { GPS_CLIENTE } from './soporte/api.js';

test.describe('GPS', () => {
  test('sin permiso de ubicación el cliente no puede pedir y el rider no se conecta', async ({ api, abrir }) => {
    const u = await api.usuario();
    const usuario = await abrir('usuarios', { ubicacion: null });
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await expect(usuario.getByText('ACTIVÁ TU UBICACIÓN', { exact: true })).toBeVisible();
    await expect(usuario.getByText('Activá tu ubicación para pedir')).toBeVisible();

    const r = await api.rider();
    const rider = await abrir('riders', { ubicacion: null });
    await ingresar(rider, r.email, r.clave, /\/inicio$/);
    await rider.locator('button.interruptor').click();
    await expect(rider.getByRole('alert')).toContainText('permití la ubicación');
    await expect(rider.locator('button.interruptor')).toHaveAttribute('aria-pressed', 'false');
  });

  test('el cliente ve a cuánto está el rider y, si cancela con el rider pasada la mitad, el rider cobra el envío', async ({ api, abrir }) => {
    const k = await api.kiosco();
    const r = await api.rider({ zona: 'san-miguel' });
    const u = await api.usuario();
    const p = await api.pedido(u.token, k, 'rider');
    await api.esperarOferta(r.token, p.id);
    await api.llamar('POST', `/rider/ofertas/${p.id}/aceptar`, {}, r.token);
    await api.llamar('POST', `/kiosco/pedidos/${p.id}/aprobar-rider`, { aprobado: true }, k.token);
    await api.llamar('POST', `/rider/pedidos/${p.id}/retiro`, {}, r.token);
    await api.llamar('POST', `/kiosco/pedidos/${p.id}/envio`, {}, k.token);
    await api.llamar('POST', `/rider/pedidos/${p.id}/en-camino`, {}, r.token);

    // El kiosco está a 0,6 km del cliente y el GPS del rider ya está en la puerta: la app lo manda sola.
    const rider = await abrir('riders', { ubicacion: GPS_CLIENTE });
    await ingresar(rider, r.email, r.clave, /\/inicio$/);
    await rider.goto(`${urlApp('riders')}/vivo`);

    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedido/${p.id}`);
    await expect(usuario.getByText('Tu rider está a 0 km')).toBeVisible();

    await boton(usuario, 'Cancelar pedido').click();
    await expect(usuario.getByText('El rider ya había hecho más de la mitad del viaje: el envío no se devuelve.')).toBeVisible();
    const { cancelacion } = await api.llamar('GET', `/pedidos/${p.id}`, undefined, u.token);
    expect(cancelacion).toMatchObject({ motivo: 'cliente', riderCobra: true, reintegro: p.items[0].cantidad * p.items[0].precioUnitario });

    await expect(rider.getByText('Ya hiciste más de la mitad del viaje')).toBeVisible();
  });
});
