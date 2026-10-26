import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DespachoService } from '../src/pedidos/despacho.service.js';
import { crearApp } from './app.js';

describe('Flujo completo del pedido', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });
  let dev: string;
  let kiosco: string;
  let kioscoId: string;
  let rider: string;
  let rider2: string;
  let usuario: string;
  let productos: { id: string; nombre: string; precio: number }[];

  async function aprobar(email: string) {
    const pend = await api().get('/api/cuentas/pendientes').set(auth(dev)).expect(200);
    const id = pend.body.find((c: { email: string }) => c.email === email).id;
    await api().post(`/api/cuentas/${id}/aprobar`).set(auth(dev)).expect(200);
  }

  async function ingresar(email: string, clave: string) {
    return (await api().post('/api/auth/ingresar').send({ email, clave }).expect(200)).body.token as string;
  }

  async function registrarRider(email: string, dni: string) {
    await api()
      .post('/api/auth/registro/rider')
      .send({ email, clave: 'claveRider1', nombre: 'Rider Prueba', telefono: '11 5555-0142', dni, vehiculoModelo: 'Honda Wave 110', patente: 'A123BCD', aliasCbu: 'rider.alias.fd' })
      .expect(201);
    await aprobar(email);
    return ingresar(email, 'claveRider1');
  }

  beforeAll(async () => {
    app = await crearApp();
    dev = await ingresar('dev@test.local', 'clave-dev-123');

    await api()
      .post('/api/auth/registro/kiosco')
      .send({ email: 'k@flujo.local', clave: 'claveKiosco1', nombre: 'Kiosco Flujo', direccion: 'Belgrano 980', zona: 'san-miguel', aliasCobro: 'kiosco.flujo' })
      .expect(201);
    await aprobar('k@flujo.local');
    kiosco = await ingresar('k@flujo.local', 'claveKiosco1');
    kioscoId = (await api().get('/api/kiosco').set(auth(kiosco)).expect(200)).body.id;
    await api().post(`/api/admin/kioscos/${kioscoId}/saldo`).set(auth(dev)).send({ monto: 20000, referencia: 'Op. 1' }).expect(200);
    for (const [nombre, precio] of [['Coca-Cola 1,5 L', 2800], ['Hielo 2 kg', 1500]] as const) {
      await api().post('/api/kiosco/productos').set(auth(kiosco)).send({ nombre, precio }).expect(201);
    }

    rider = await registrarRider('r1@flujo.local', '30111222');
    rider2 = await registrarRider('r2@flujo.local', '30111333');

    usuario = (
      await api()
        .post('/api/auth/registro/usuario')
        .send({ email: 'u@flujo.local', clave: 'claveUsuario1', nombre: 'Martina R', telefono: '11 5555-0199', direccion: 'Belgrano 845', zona: 'san-miguel' })
        .expect(201)
    ).body.token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('el usuario ve el kiosco con distancia y envío, y su catálogo', async () => {
    const ks = await api().get('/api/kioscos?zona=san-miguel').set(auth(usuario)).expect(200);
    const k = ks.body.find((x: { id: string }) => x.id === kioscoId);
    expect(k).toMatchObject({ nombre: 'Kiosco Flujo', zona: 'san-miguel', abierto: true });
    expect(k.costoEnvio).toBeGreaterThanOrEqual(1000);
    expect(k.saldo).toBeUndefined();
    productos = (await api().get(`/api/kioscos/${kioscoId}/productos`).set(auth(usuario)).expect(200)).body;
    expect(productos.map((p) => p.nombre)).toEqual(['Coca-Cola 1,5 L', 'Hielo 2 kg']);
  });

  it('rechaza pedidos por debajo del mínimo', async () => {
    const coca = productos.find((p) => p.precio === 2800)!;
    const r = await api().post('/api/pedidos').set(auth(usuario)).send({ kioscoId, items: [{ productoId: coca.id, cantidad: 2 }] }).expect(409);
    expect(r.body.message).toContain('pedido mínimo');
  });

  it('recorre todo el flujo hasta Entregado', async () => {
    const coca = productos.find((p) => p.precio === 2800)!;
    const hielo = productos.find((p) => p.precio === 1500)!;
    const creado = await api()
      .post('/api/pedidos')
      .set(auth(usuario))
      .send({ kioscoId, items: [{ productoId: coca.id, cantidad: 6 }, { productoId: hielo.id, cantidad: 2 }] })
      .expect(201);
    const p = creado.body;
    expect(p).toMatchObject({ estado: 'esperando', fase: 'stock', pago: 'pendiente', comisionFreeDeli: 1980 });
    expect(p.pin).toMatch(/^\d{4}$/);
    await api().post('/api/pedidos').set(auth(usuario)).send({ kioscoId, items: [{ productoId: coca.id, cantidad: 6 }] }).expect(409);

    // Kiosco: no tiene hielo. Se ajusta y el cliente acepta.
    const enVivo = await api().get('/api/kiosco/pedidos/en-vivo').set(auth(kiosco)).expect(200);
    expect(enVivo.body.map((x: { id: string }) => x.id)).toContain(p.id);
    const ajustado = await api().post(`/api/kiosco/pedidos/${p.id}/stock`).set(auth(kiosco)).send({ faltantes: [hielo.id] }).expect(200);
    expect(ajustado.body).toMatchObject({ fase: 'ajuste', comisionFreeDeli: 1680 });
    expect(ajustado.body.itemsQuitados).toHaveLength(1);
    await api().post(`/api/pedidos/${p.id}/aceptar-ajuste`).set(auth(usuario)).expect(200);

    // Transferencia recibida: se busca rider.
    const conRider = await api().post(`/api/kiosco/pedidos/${p.id}/transferencia`).set(auth(kiosco)).expect(200);
    expect(conRider.body).toMatchObject({ fase: 'rider', pago: 'transferido' });

    // Sin riders disponibles no hay oferta.
    await app.get(DespachoService).barrer();
    expect((await api().get('/api/rider/oferta').set(auth(rider)).expect(200)).body).toEqual({});

    // El rider se conecta en San Miguel y recibe la oferta.
    await api().patch('/api/rider/estado').set(auth(rider)).send({ disponible: true, zonas: ['san-miguel'] }).expect(200);
    const oferta = (await api().get('/api/rider/oferta').set(auth(rider)).expect(200)).body;
    expect(oferta).toMatchObject({ pedidoId: p.id, entregaAproximada: 'Belgrano al 800', cantidadProductos: 6 });
    expect(new Date(oferta.expiraEn).getTime()).toBeGreaterThan(Date.now());

    // Otro rider no puede aceptar una oferta que no es suya.
    await api().post(`/api/rider/ofertas/${p.id}/aceptar`).set(auth(rider2)).expect(404);
    const aceptado = await api().post(`/api/rider/ofertas/${p.id}/aceptar`).set(auth(rider)).expect(200);
    expect(aceptado.body).toMatchObject({ fase: 'aprobacion' });

    // El kiosco aprueba al rider.
    await api().post(`/api/kiosco/pedidos/${p.id}/aprobar-rider`).set(auth(kiosco)).send({ aprobado: true }).expect(200);
    const pedidoRider = (await api().get('/api/rider/pedido').set(auth(rider)).expect(200)).body;
    expect(pedidoRider).toMatchObject({ id: p.id, estado: 'aceptado' });

    // Retiro con doble confirmación.
    const soloRider = await api().post(`/api/rider/pedidos/${p.id}/retiro`).set(auth(rider)).expect(200);
    expect(soloRider.body.estado).toBe('aceptado');
    const retirado = await api().post(`/api/kiosco/pedidos/${p.id}/envio`).set(auth(kiosco)).expect(200);
    expect(retirado.body.estado).toBe('retirado');

    await api().post(`/api/rider/pedidos/${p.id}/en-camino`).set(auth(rider)).expect(200);
    const pinMalo = p.pin === '0000' ? '1111' : '0000';
    const error = await api().post(`/api/rider/pedidos/${p.id}/entregar`).set(auth(rider)).send({ pin: pinMalo }).expect(409);
    expect(error.body.message).toBe('PIN incorrecto.');
    const entregado = await api().post(`/api/rider/pedidos/${p.id}/entregar`).set(auth(rider)).send({ pin: p.pin }).expect(200);
    expect(entregado.body).toMatchObject({ estado: 'entregado', pago: 'liberado' });

    // La comisión se descontó del saldo prepago.
    const k = await api().get('/api/kiosco').set(auth(kiosco)).expect(200);
    expect(k.body.saldo).toBe(20000 - 1680);

    // El usuario lo ve entregado y con el rider asignado.
    const visto = await api().get(`/api/pedidos/${p.id}`).set(auth(usuario)).expect(200);
    expect(visto.body.estado).toBe('entregado');
    expect((await api().get(`/api/pedidos/${p.id}/rider`).set(auth(usuario)).expect(200)).body).toEqual({ nombre: 'Rider P.', vehiculo: 'Honda Wave 110', patente: 'A123BCD' });
    expect((await api().get('/api/pedidos/recientes').set(auth(usuario)).expect(200)).body[0].id).toBe(p.id);
  });

  it('dos confirmaciones simultáneas no se pisan', async () => {
    const coca = productos.find((x) => x.precio === 2800)!;
    const p = (await api().post('/api/pedidos').set(auth(usuario)).send({ kioscoId, items: [{ productoId: coca.id, cantidad: 6 }] }).expect(201)).body;
    const [a, b] = await Promise.all([
      api().post(`/api/kiosco/pedidos/${p.id}/stock`).set(auth(kiosco)).send({ faltantes: [] }),
      api().post(`/api/kiosco/pedidos/${p.id}/stock`).set(auth(kiosco)).send({ faltantes: [] }),
    ]);
    expect([a.status, b.status].sort()).toEqual([200, 409]);
    await api().post(`/api/pedidos/${p.id}/cancelar`).set(auth(usuario)).expect(200);
  });

  it('cada rol solo accede a lo suyo', async () => {
    await api().get('/api/kiosco/pedidos/en-vivo').set(auth(usuario)).expect(403);
    await api().post('/api/pedidos').set(auth(kiosco)).send({ kioscoId, items: [] }).expect(403);
    await api().post(`/api/admin/kioscos/${kioscoId}/saldo`).set(auth(kiosco)).send({ monto: 1 }).expect(403);
  });
});
