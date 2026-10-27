import { expect, test } from './soporte/fixtures.js';

test.describe('pedidos simultáneos', () => {
  test('confirmar la entrega dos veces a la vez descuenta la comisión una sola vez', async ({ api }) => {
    const k = await api.kiosco({ zona: 'muniz', saldo: 20_000 });
    const u = await api.usuario({ zona: 'muniz' });
    const r = await api.rider({ zona: 'muniz' });
    const p = await api.pedido(u.token, k, 'rider');
    await api.esperarOferta(r.token, p.id);
    await api.llamar('POST', `/rider/ofertas/${p.id}/aceptar`, {}, r.token);
    await api.llamar('POST', `/kiosco/pedidos/${p.id}/aprobar-rider`, { aprobado: true }, k.token);
    // Los dos confirman el retiro al mismo tiempo.
    const retiros = await Promise.all([
      api.cruda('POST', `/rider/pedidos/${p.id}/retiro`, {}, r.token),
      api.cruda('POST', `/kiosco/pedidos/${p.id}/envio`, {}, k.token),
    ]);
    expect(retiros.map((x) => x.status())).toEqual([200, 200]);
    expect((await api.llamar('GET', `/pedidos/${p.id}`, undefined, u.token)).estado).toBe('retirado');
    await api.llamar('POST', `/rider/pedidos/${p.id}/en-camino`, {}, r.token);

    const entregas = await Promise.all(Array.from({ length: 5 }, () => api.cruda('POST', `/rider/pedidos/${p.id}/entregar`, { pin: p.pin }, r.token)));
    expect(entregas.filter((x) => x.status() === 200)).toHaveLength(1);
    const saldo = (await api.llamar('GET', '/kiosco', undefined, k.token)).saldo;
    expect(saldo).toBe(20_000 - p.comisionFreeDeli);
  });

  test('dos usuarios no pueden abrir dos pedidos con la misma cuenta a la vez', async ({ api }) => {
    const k = await api.kiosco();
    const u = await api.usuario();
    const cuerpo = { kioscoId: k.id, items: [{ productoId: k.productos[0].id, cantidad: 6 }] };
    const intentos = await Promise.all(Array.from({ length: 4 }, () => api.cruda('POST', '/pedidos', cuerpo, u.token)));
    expect(intentos.filter((x) => x.status() === 201)).toHaveLength(1);
  });

  test('con dos riders conectados, el pedido lo toma uno solo', async ({ api }) => {
    const k = await api.kiosco({ zona: 'bella-vista' });
    const u = await api.usuario({ zona: 'bella-vista' });
    const a = await api.rider({ zona: 'bella-vista' });
    const b = await api.rider({ zona: 'bella-vista' });
    const p = await api.pedido(u.token, k, 'rider');
    await expect
      .poll(async () => {
        const [oa, ob] = await Promise.all([a, b].map((x) => api.llamar('GET', '/rider/oferta', undefined, x.token)));
        return [oa?.pedidoId === p.id, ob?.pedidoId === p.id].filter(Boolean).length;
      })
      .toBe(1);
    const aceptar = await Promise.all([a, b].map((x) => api.cruda('POST', `/rider/ofertas/${p.id}/aceptar`, {}, x.token)));
    expect(aceptar.filter((x) => x.status() === 200)).toHaveLength(1);
  });
});
