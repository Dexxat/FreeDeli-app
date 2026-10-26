import type { INestApplication } from '@nestjs/common';
import { crearApp } from './app.js';
import { armarEscenario, auth } from './escenario.js';

describe('Perfiles, reportes y panel Dev', () => {
  let app: INestApplication;
  let e: Awaited<ReturnType<typeof armarEscenario>>;
  let pedido: { id: string; numero: number; comisionFreeDeli: number };

  beforeAll(async () => {
    app = await crearApp();
    e = await armarEscenario(app, 'rep');
    pedido = await e.pedidoEntregado();
  });
  afterAll(async () => {
    await app.close();
  });

  it('usuario: perfil y cambio de dirección', async () => {
    const perfil = (await e.api().get('/api/usuario/perfil').set(auth(e.usuario)).expect(200)).body;
    expect(perfil).toMatchObject({ nombre: 'Martina', nombreCorto: 'Martina R.', direccion: { direccion: 'Belgrano 845', zona: 'san-miguel' } });
    const nuevo = (await e.api().patch('/api/usuario/direccion').set(auth(e.usuario)).send({ direccion: 'Paunero 1500', notas: 'PB', zona: 'muniz' }).expect(200)).body;
    expect(nuevo.direccion).toMatchObject({ direccion: 'Paunero 1500', notas: 'PB', zona: 'muniz' });
    await e.api().patch('/api/usuario/direccion').set(auth(e.usuario)).send({ direccion: 'Sin altura', zona: 'muniz' }).expect(400);
  });

  it('rider: historial, ganancias, demanda y perfil', async () => {
    const hist = (await e.api().get('/api/rider/historial?periodo=hoy').set(auth(e.rider)).expect(200)).body;
    expect(hist.map((p: { id: string }) => p.id)).toContain(pedido.id);
    const g = (await e.api().get('/api/rider/ganancias?periodo=jornada').set(auth(e.rider)).expect(200)).body;
    expect(g.cantidadPedidos).toBe(1);
    expect(g.envios + g.propinas).toBe(g.total);
    expect(g.barras).toHaveLength(24);
    await e.api().get('/api/rider/ganancias?periodo=anio').set(auth(e.rider)).expect(400);
    const demanda = (await e.api().get('/api/rider/demanda').set(auth(e.rider)).expect(200)).body;
    // Otros archivos de test dejan riders conectados en la misma base: al menos este.
    expect(demanda.find((d: { zona: string }) => d.zona === 'san-miguel').ridersActivos).toBeGreaterThanOrEqual(1);
    const perfil = (await e.api().patch('/api/rider/perfil').set(auth(e.rider)).send({ patente: 'b456cde', sonidos8bit: false }).expect(200)).body;
    expect(perfil).toMatchObject({ vehiculo: { patente: 'B456CDE' }, sonidos8bit: false });
  });

  it('kiosco: historial, ganancias, saldo y datos', async () => {
    const hist = (await e.api().get('/api/kiosco/historial?periodo=hoy').set(auth(e.kiosco)).expect(200)).body;
    expect(hist[0].id).toBe(pedido.id);
    const g = (await e.api().get('/api/kiosco/ganancias?periodo=jornada').set(auth(e.kiosco)).expect(200)).body;
    expect(g.envios + g.comisiones + g.neto).toBe(g.cobrado);
    const saldo = (await e.api().get('/api/kiosco/saldo').set(auth(e.kiosco)).expect(200)).body;
    expect(saldo.map((m: { tipo: string }) => m.tipo)).toEqual(['COMISION', 'CARGA']);
    expect(saldo[0]).toMatchObject({ monto: -pedido.comisionFreeDeli, referencia: `#A-${pedido.numero}`, saldoResultante: 30000 - pedido.comisionFreeDeli });
    const k = (await e.api().patch('/api/kiosco/datos').set(auth(e.kiosco)).send({ nombre: 'El Faro 24', direccion: 'Belgrano 980', aliasCobro: 'faro.nuevo', tiempoEstimadoMin: 20 }).expect(200)).body;
    expect(k).toMatchObject({ nombre: 'El Faro 24', aliasCobro: 'faro.nuevo', tiempoEstimadoMin: 20 });
  });

  it('Dev: resumen, MAIN, ganancias y entregas', async () => {
    const r = (await e.api().get('/api/admin/resumen').set(auth(e.dev)).expect(200)).body;
    expect(r.entregadosHoy).toBeGreaterThanOrEqual(1);
    expect(r.comisionesHoy).toBeGreaterThanOrEqual(pedido.comisionFreeDeli);
    const main = (await e.api().get('/api/admin/pedidos-jornada?zonas=san-miguel').set(auth(e.dev)).expect(200)).body;
    const fila = main.find((f: { pedidoId: string }) => f.pedidoId === pedido.id);
    expect(fila).toMatchObject({ estado: 'entregado', riderNombre: 'Lucas Romero', zona: 'san-miguel' });
    expect((await e.api().get('/api/admin/pedidos-jornada?zonas=muniz').set(auth(e.dev)).expect(200)).body.some((f: { pedidoId: string }) => f.pedidoId === pedido.id)).toBe(false);
    const g = (await e.api().get('/api/admin/ganancias?periodo=mes').set(auth(e.dev)).expect(200)).body;
    expect(g.total).toBe(g.porZona.reduce((a: number, z: { total: number }) => a + z.total, 0));
    const entregas = (await e.api().get('/api/admin/entregas?periodo=jornada').set(auth(e.dev)).expect(200)).body;
    expect(entregas.find((x: { pedidoId: string }) => x.pedidoId === pedido.id).duracionMin).toBeGreaterThanOrEqual(0);
  });

  it('Dev: fichas de kiosco y rider, pausa', async () => {
    const k = (await e.api().get(`/api/admin/kioscos/${e.kioscoId}`).set(auth(e.dev)).expect(200)).body;
    expect(k).toMatchObject({ pedidosHoy: 1, saldoBajo: false });
    const movs = (await e.api().get(`/api/admin/kioscos/${e.kioscoId}/movimientos?periodo=hoy`).set(auth(e.dev)).expect(200)).body;
    expect(movs[0].envioRider + movs[0].comisionFreeDeli + movs[0].netoKiosco).toBe(movs[0].totalCliente);
    await e.api().post(`/api/admin/kioscos/${e.kioscoId}/pausa`).set(auth(e.dev)).send({ pausado: true }).expect(200);
    expect((await e.api().get('/api/kioscos').set(auth(e.usuario)).expect(200)).body.some((x: { id: string }) => x.id === e.kioscoId)).toBe(false);
    await e.api().post(`/api/admin/kioscos/${e.kioscoId}/pausa`).set(auth(e.dev)).send({ pausado: false }).expect(200);

    const rider = (await e.api().get(`/api/admin/riders/${e.riderId}`).set(auth(e.dev)).expect(200)).body;
    expect(rider).toMatchObject({ entregasHoy: 1, disponible: true, enCurso: null });
    await e.api().post(`/api/admin/riders/${e.riderId}/pausa`).set(auth(e.dev)).send({ pausado: true }).expect(200);
    const intento = await e.api().patch('/api/rider/estado').set(auth(e.rider)).send({ disponible: true }).expect(403);
    expect(intento.body.message).toContain('pausada');
    await e.api().post(`/api/admin/riders/${e.riderId}/pausa`).set(auth(e.dev)).send({ pausado: false }).expect(200);
  });

  it('Dev: conflictos con notas y resolución', async () => {
    const c = (await e.api().post('/api/admin/conflictos').set(auth(e.dev)).send({ pedidoId: pedido.id, tipo: 'producto', descripcion: 'Faltó una gaseosa' }).expect(201)).body;
    expect(c).toMatchObject({ estado: 'abierto', tipo: 'producto', numeroPedido: pedido.numero });
    await e.api().patch(`/api/admin/conflictos/${c.id}`).set(auth(e.dev)).send({ estado: 'en-seguimiento', nota: 'Hablé con el kiosco' }).expect(200);
    const r = (await e.api().patch(`/api/admin/conflictos/${c.id}`).set(auth(e.dev)).send({ estado: 'resuelto' }).expect(200)).body;
    expect(r.notas.map((n: { texto: string }) => n.texto)).toEqual(['Hablé con el kiosco']);
    expect(r.resueltoEn).toBeTruthy();
    await e.api().post('/api/admin/conflictos').set(auth(e.dev)).send({ tipo: 'inventado', descripcion: 'x' }).expect(400);
  });
});
