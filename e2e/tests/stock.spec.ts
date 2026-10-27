import { boton, expect, ingresar, test, urlApp } from './soporte/fixtures.js';

const pesos = (n: number) => '$' + n.toLocaleString('es-AR');

test.describe('falta de stock', () => {
  test('el kiosco quita un producto y el cliente acepta el pedido ajustado', async ({ api, abrir }) => {
    const k = await api.kiosco();
    const u = await api.usuario();
    const [coca, hielo] = k.productos;
    const p = await api.pedido(u.token, k, 'stock', [{ productoId: coca.id, cantidad: 6 }, { productoId: hielo.id, cantidad: 2 }]);
    expect(p.comisionFreeDeli).toBe(1980); // 10 % de $19.800

    const kiosco = await abrir('kioscos');
    await ingresar(kiosco, k.email, k.clave, /\/inicio$/);
    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedido/${p.id}`);
    await expect(usuario.getByText('REVISANDO STOCK')).toBeVisible();

    const tarjeta = kiosco.locator('article', { hasText: `#A-${p.numero}` });
    await tarjeta.getByLabel(/Hielo 2 kg/).check();
    await expect(tarjeta.getByText('FALTA')).toBeVisible();
    await boton(tarjeta, 'CONFIRMAR SIN 1 PRODUCTO').click();
    await expect(tarjeta).toContainText('Le avisamos al cliente lo que falta');

    await expect(usuario.getByText('FALTAN PRODUCTOS')).toBeVisible();
    await expect(usuario.getByText('2 × Hielo 2 kg')).toBeVisible();
    await expect(usuario.getByText(`Nuevo total: ${pesos(16_800 + 2_500)}`)).toBeVisible();
    await boton(usuario, 'ACEPTAR').click();
    await expect(usuario.getByText('PAGO POR TRANSFERENCIA')).toBeVisible();
    await expect(usuario.getByText(`Transferí ${pesos(19_300)}`)).toBeVisible();

    // La comisión se recalcula sobre lo que queda.
    const ajustado = await api.llamar('GET', `/pedidos/${p.id}`, undefined, u.token);
    expect(ajustado).toMatchObject({ fase: 'transferencia', comisionFreeDeli: 1680 });
    expect(ajustado.items).toHaveLength(1);
    await expect(tarjeta).toContainText(`El cliente tiene que transferirte ${pesos(19_300)}`);
  });

  test('si el cliente no acepta el ajuste, cancela sin pagar y puede volver a pedir', async ({ api, abrir }) => {
    const k = await api.kiosco();
    const u = await api.usuario();
    const [coca, hielo] = k.productos;
    const p = await api.pedido(u.token, k, 'stock', [{ productoId: coca.id, cantidad: 6 }, { productoId: hielo.id, cantidad: 2 }]);
    await api.llamar('POST', `/kiosco/pedidos/${p.id}/stock`, { faltantes: [hielo.id] }, k.token);

    const kiosco = await abrir('kioscos');
    await ingresar(kiosco, k.email, k.clave, /\/inicio$/);
    const usuario = await abrir('usuarios');
    await ingresar(usuario, u.email, u.clave, /\/inicio$/);
    await usuario.goto(`${urlApp('usuarios')}/pedido/${p.id}`);
    await expect(kiosco.locator('article', { hasText: `#A-${p.numero}` })).toBeVisible();

    await boton(usuario, 'Cancelar pedido').click();
    await expect(usuario.getByText(`PEDIDO #A-${p.numero} CANCELADO`)).toBeVisible();
    await expect(usuario.getByText('No se cobró nada')).toBeVisible();
    await expect(kiosco.locator('article', { hasText: `#A-${p.numero}` })).toHaveCount(0);

    // Sin pedido abierto, puede pedir de nuevo.
    const otro = await api.pedido(u.token, k);
    expect(otro.estado).toBe('esperando');
  });
});
