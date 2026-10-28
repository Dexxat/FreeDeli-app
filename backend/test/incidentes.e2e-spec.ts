import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { crearApp } from './app.js';
import { armarEscenario, auth } from './escenario.js';

/** Cancelaciones, reintegros, pausas por cancelar o abandonar y herramientas de Dev para incidentes. */
describe('incidentes (e2e)', () => {
  let app: INestApplication;
  let e: Awaited<ReturnType<typeof armarEscenario>>;
  let db: PrismaService;
  /** 6 Coca-Cola a $2.800 más el envío que paga el cliente. */
  let total: number;

  beforeAll(async () => {
    app = await crearApp();
    e = await armarEscenario(app, 'incidentes');
    db = app.get(PrismaService);
  });
  afterAll(async () => {
    await db.rider.update({ where: { id: e.riderId }, data: { disponible: false } });
    await app.close();
  });
  beforeEach(async () => {
    await db.rider.updateMany({ where: { id: { not: e.riderId } }, data: { disponible: false } });
    // Cada caso arranca con el cliente y el rider habilitados y sin cancelaciones que cuenten.
    await db.usuario.updateMany({ where: { cuenta: { email: 'u-incidentes@test.local' } }, data: { pausado: false, habilitadoEn: new Date() } });
    await db.rider.update({ where: { id: e.riderId }, data: { pausado: false, disponible: true, habilitadoEn: new Date() } });
  });

  const cancelar = (id: string) => e.api().post(`/api/pedidos/${id}/cancelar`).set(auth(e.usuario));
  const cancelarDev = (id: string, motivo: 'rider' | 'dev') => e.api().post(`/api/admin/pedidos/${id}/cancelar`).set(auth(e.dev)).send({ motivo });
  const enVivo = async () => (await e.api().get('/api/kiosco/pedidos/en-vivo').set(auth(e.kiosco)).expect(200)).body as { id: string; estado: string }[];
  const alertas = async () => (await e.api().get('/api/admin/resumen').set(auth(e.dev)).expect(200)).body.alertas as { tipo: string; usuarioId?: string; ruta?: string }[];

  it('el cliente cancela después de pagar: el kiosco ve el reintegro hasta marcarlo devuelto', async () => {
    const p = await e.pedidoPagado();
    const cancelado = (await cancelar(p.id).expect(200)).body;
    total = cancelado.cancelacion.reintegro;
    expect(total).toBeGreaterThan(6 * 2800);
    expect(cancelado.cancelacion).toEqual({ motivo: 'cliente', reintegro: total, riderCobra: false });

    expect((await enVivo()).map((x) => x.id)).toContain(p.id);
    const devuelto = (await e.api().post(`/api/kiosco/pedidos/${p.id}/reintegro`).set(auth(e.kiosco)).expect(200)).body;
    expect(devuelto.cancelacion.reintegradoEn).toBeTruthy();
    expect((await enVivo()).map((x) => x.id)).not.toContain(p.id);
    await cancelar(p.id).expect(409);
  });

  it('a los 10 minutos sin rider, el cliente sigue esperando o cancela sin que le cuente', async () => {
    await db.rider.update({ where: { id: e.riderId }, data: { disponible: false } });
    const p = await e.pedidoPagado();
    const haceMinutos = (m: number) => db.pedido.update({ where: { id: p.id }, data: { buscandoRiderDesde: new Date(Date.now() - m * 60_000) } });
    await haceMinutos(11);
    const sigue = (await e.api().post(`/api/pedidos/${p.id}/seguir-esperando`).set(auth(e.usuario)).expect(200)).body;
    expect(Date.now() - new Date(sigue.buscandoRiderDesde).getTime()).toBeLessThan(60_000);
    await haceMinutos(10);
    expect((await cancelar(p.id).expect(200)).body.cancelacion.motivo).toBe('sin-rider');
  });

  it('a la tercera cancelación en la semana se pausa la cuenta hasta que Dev la reactive', async () => {
    for (let i = 0; i < 3; i++) await cancelar((await e.pedidoPagado()).id).expect(200);
    expect((await e.api().get('/api/usuario/perfil').set(auth(e.usuario)).expect(200)).body.pausado).toBe(true);
    const r = await e.api().post('/api/pedidos').set(auth(e.usuario)).send({ kioscoId: e.kioscoId, items: [{ productoId: e.coca.id, cantidad: 6 }] }).expect(409);
    expect(r.body.codigo).toBe('cuenta-pausada');

    const alerta = (await alertas()).find((a) => a.tipo === 'cliente-pausado');
    expect(alerta?.usuarioId).toBeTruthy();
    await e.api().post(`/api/admin/usuarios/${alerta!.usuarioId}/reactivar`).set(auth(e.dev)).expect(200);
    // Reactivado, las cancelaciones anteriores ya no cuentan.
    await cancelar((await e.pedidoPagado()).id).expect(200);
    expect((await e.api().get('/api/usuario/perfil').set(auth(e.usuario)).expect(200)).body.pausado).toBe(false);
  });

  it('Dev cancela porque el rider no fue: reintegro total y al tercer abandono se pausa al rider', async () => {
    for (let i = 0; i < 3; i++) {
      const p = await e.pedidoAceptado();
      const c = (await cancelarDev(p.id, 'rider').expect(200)).body;
      expect(c.cancelacion).toMatchObject({ motivo: 'rider', reintegro: total, riderCobra: false });
      await e.api().post(`/api/kiosco/pedidos/${p.id}/reintegro`).set(auth(e.kiosco)).expect(200);
    }
    const ficha = (await e.api().get(`/api/admin/riders/${e.riderId}`).set(auth(e.dev)).expect(200)).body;
    expect(ficha).toMatchObject({ pausado: true, disponible: false, abandonos: 3, deBaja: false });
    expect(await alertas()).toEqual(expect.arrayContaining([expect.objectContaining({ tipo: 'rider-pausado', ruta: `/riders/${e.riderId}` })]));
    await e.api().patch('/api/rider/estado').set(auth(e.rider)).send({ disponible: true }).expect(403);

    // Dev lo reactiva: los abandonos vuelven a cero.
    const reactivado = (await e.api().post(`/api/admin/riders/${e.riderId}/pausa`).set(auth(e.dev)).send({ pausado: false }).expect(200)).body;
    expect(reactivado).toMatchObject({ pausado: false, abandonos: 0 });
  });

  it('Dev no puede culpar al rider de un pedido sin rider, pero sí cancelarlo por otro motivo', async () => {
    await db.rider.update({ where: { id: e.riderId }, data: { disponible: false } });
    const p = await e.pedidoPagado();
    await cancelarDev(p.id, 'rider').expect(409);
    await cancelarDev(p.id, 'otro' as 'dev').expect(400);
    expect((await cancelarDev(p.id, 'dev').expect(200)).body.cancelacion).toMatchObject({ motivo: 'dev', reintegro: total });
    await e.api().post(`/api/kiosco/pedidos/${p.id}/reintegro`).set(auth(e.kiosco)).expect(200);
  });

  it('Dev marca entregado un pedido en camino y se liquida la comisión', async () => {
    const saldo = async () => (await e.api().get('/api/kiosco').set(auth(e.kiosco)).expect(200)).body.saldo as number;
    const p = await e.pedidoEnCamino();
    const antes = await saldo();
    expect((await e.api().post(`/api/admin/pedidos/${p.id}/entregar`).set(auth(e.dev)).expect(200)).body).toMatchObject({ estado: 'entregado', pago: 'liberado' });
    expect(await saldo()).toBe(antes - p.comisionFreeDeli);
    await e.api().post(`/api/admin/pedidos/${p.id}/entregar`).set(auth(e.dev)).expect(409);
  });

  it('solo Dev usa las herramientas de incidentes', async () => {
    const p = await e.pedidoEnCamino();
    await e.api().post(`/api/admin/pedidos/${p.id}/entregar`).set(auth(e.kiosco)).expect(403);
    await e.api().post(`/api/admin/pedidos/${p.id}/cancelar`).set(auth(e.usuario)).send({ motivo: 'dev' }).expect(403);
    await e.entregar(p);
  });

  it('Dev da de baja al rider: no puede volver a ingresar', async () => {
    const ficha = (await e.api().post(`/api/admin/riders/${e.riderId}/baja`).set(auth(e.dev)).expect(200)).body;
    expect(ficha).toMatchObject({ deBaja: true, pausado: true, disponible: false });
    const { token, cuenta } = (await e.api().post('/api/auth/ingresar').send({ email: 'r-incidentes@test.local', clave: 'claveRider1' }).expect(200)).body;
    expect(cuenta.estado).toBe('RECHAZADA');
    await e.api().get('/api/rider').set(auth(token)).expect(403);
  });
});
