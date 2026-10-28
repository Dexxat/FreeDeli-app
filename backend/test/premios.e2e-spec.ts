import type { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { crearApp } from './app.js';
import { GPS_CLIENTE, armarEscenario, auth } from './escenario.js';

/** FREEDELI RUSH: estrellas, premio de $2.500 y quién lo paga. */
describe('premios (e2e)', () => {
  let app: INestApplication;
  let e: Awaited<ReturnType<typeof armarEscenario>>;
  let db: PrismaService;

  beforeAll(async () => {
    app = await crearApp();
    e = await armarEscenario(app, 'premios');
    db = app.get(PrismaService);
  });
  afterAll(async () => {
    // Deja la base como la encontró para los demás archivos: su rider desconectado.
    await db.rider.update({ where: { id: e.riderId }, data: { disponible: false } });
    await app.close();
  });
  // Los otros archivos de test dejan riders conectados en la misma base: que la oferta llegue a este.
  beforeEach(() => db.rider.updateMany({ where: { id: { not: e.riderId } }, data: { disponible: false } }));

  /** Simula que el pedido salió en camino hace `minutos`. */
  const enCaminoHace = (id: string, minutos: number) => db.pedido.update({ where: { id }, data: { enCaminoEn: new Date(Date.now() - minutos * 60_000) } });
  const perfil = async () => (await e.api().get('/api/usuario/perfil').set(auth(e.usuario)).expect(200)).body;
  const saldoKiosco = async () => (await e.api().get('/api/kiosco').set(auth(e.kiosco)).expect(200)).body.saldo as number;

  it('la estrella exige 10 minutos en camino y es una por pedido', async () => {
    const p = await e.pedidoEnCamino();
    const antes = await e.api().post(`/api/pedidos/${p.id}/estrella`).set(auth(e.usuario)).expect(409);
    expect(antes.body.message).toContain('10 minutos');
    await enCaminoHace(p.id, 11);
    expect((await e.api().post(`/api/pedidos/${p.id}/estrella`).set(auth(e.usuario)).expect(200)).body).toEqual({ estrellas: 1, saldoFavor: 0, premio: false });
    await e.api().post(`/api/pedidos/${p.id}/estrella`).set(auth(e.usuario)).expect(409);
    // Nadie más puede reclamarla.
    await e.api().post(`/api/pedidos/${p.id}/estrella`).set(auth(e.kiosco)).expect(403);
    await e.entregar(p);
  });

  it('con 5 estrellas gana $2.500, que se descuentan del próximo pedido y los pone FreeDeli', async () => {
    await db.usuario.updateMany({ where: { cuenta: { email: 'u-premios@test.local' } }, data: { estrellas: 4 } });
    const p = await e.pedidoEnCamino();
    await enCaminoHace(p.id, 12);
    expect((await e.api().post(`/api/pedidos/${p.id}/estrella`).set(auth(e.usuario)).expect(200)).body).toEqual({ estrellas: 0, saldoFavor: 2500, premio: true });
    await e.entregar(p);
    expect(await perfil()).toMatchObject({ estrellas: 0, saldoFavor: 2500 });

    const gananciaAntes = (await e.api().get('/api/admin/ganancias?periodo=jornada').set(auth(e.dev)).expect(200)).body.total as number;
    const saldoAntes = await saldoKiosco();
    const conPremio = await e.pedidoEnCamino();
    expect(conPremio.descuentoPremio).toBe(2500);
    expect((await perfil()).saldoFavor).toBe(0);
    await e.entregar(conPremio);

    // El kiosco: paga la comisión y FreeDeli le devuelve los $2.500 que no cobró al cliente.
    expect(await saldoKiosco()).toBe(saldoAntes - conPremio.comisionFreeDeli + 2500);
    const movs = (await e.api().get('/api/kiosco/saldo').set(auth(e.kiosco)).expect(200)).body as { tipo: string; monto: number; referencia: string }[];
    expect(movs).toEqual(expect.arrayContaining([expect.objectContaining({ tipo: 'PREMIO', monto: 2500, referencia: `Premio #A-${conPremio.numero}` })]));
    // FreeDeli: gana la comisión menos el premio.
    const gananciaDespues = (await e.api().get('/api/admin/ganancias?periodo=jornada').set(auth(e.dev)).expect(200)).body.total as number;
    expect(gananciaDespues - gananciaAntes).toBe(conPremio.comisionFreeDeli - 2500);
  });

  it('si cancela el pedido, recupera el saldo a favor', async () => {
    await db.usuario.updateMany({ where: { cuenta: { email: 'u-premios@test.local' } }, data: { saldoFavor: 2500 } });
    const p = (await e.api().post('/api/pedidos').set(auth(e.usuario)).send({ kioscoId: e.kioscoId, items: [{ productoId: e.coca.id, cantidad: 6 }], ubicacion: GPS_CLIENTE }).expect(201)).body;
    expect(p.descuentoPremio).toBe(2500);
    expect((await perfil()).saldoFavor).toBe(0);
    await e.api().post(`/api/pedidos/${p.id}/cancelar`).set(auth(e.usuario)).expect(200);
    expect((await perfil()).saldoFavor).toBe(2500);
  });
});
