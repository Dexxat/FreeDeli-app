import type { INestApplication } from '@nestjs/common';
import type { MockInstance } from 'vitest';
import { WhatsappService } from '../src/avisos/whatsapp.service.js';
import { DespachoService } from '../src/pedidos/despacho.service.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { crearApp } from './app.js';
import { GPS_CLIENTE, armarEscenario, auth } from './escenario.js';
import { DOCUMENTOS } from './fotos.js';

/** Los avisos a los riders salen por WhatsApp en cada momento clave. */
describe('avisos por WhatsApp (e2e)', () => {
  let app: INestApplication;
  let e: Awaited<ReturnType<typeof armarEscenario>>;
  let db: PrismaService;
  let enviar: MockInstance<WhatsappService['enviar']>;

  beforeAll(async () => {
    app = await crearApp();
    e = await armarEscenario(app, 'avisos');
    db = app.get(PrismaService);
    enviar = vi.spyOn(app.get(WhatsappService), 'enviar');
  });
  afterAll(async () => {
    await db.rider.updateMany({ where: { cuenta: { email: { endsWith: '-avisos@test.local' } } }, data: { disponible: false } });
    await app.close();
  });
  beforeEach(async () => {
    enviar.mockClear();
    await db.rider.updateMany({ where: { id: { not: e.riderId } }, data: { disponible: false } });
    // Cada prueba arranca sin pedidos abiertos de la usuaria.
    await db.pedido.updateMany({ where: { usuario: { cuenta: { email: 'u-avisos@test.local' } }, estado: { notIn: ['ENTREGADO', 'CANCELADO'] } }, data: { estado: 'CANCELADO' } });
  });

  /** Espera a que los avisos (que se mandan sin bloquear) lleguen al servicio. */
  const avisos = async () => {
    await new Promise((r) => setTimeout(r, 50));
    return enviar.mock.calls.map(([telefono, plantilla, parametros]) => ({ telefono, plantilla, parametros }));
  };

  it('alta aprobada y rechazada', async () => {
    const alta = async (email: string) =>
      (await e.api().post('/api/auth/registro/rider').send({ email, clave: 'claveRider1', nombre: 'Sofía Paz', telefono: '011 15 4444-0001', dni: '41111222', vehiculoModelo: 'Honda Wave', patente: 'A111BBB', aliasCbu: 'sofia.paz.fd', ...DOCUMENTOS }).expect(201)).body.cuenta.id as string;
    const aprobada = await alta('aprobada-avisos@test.local');
    await e.api().post(`/api/cuentas/${aprobada}/aprobar`).set(auth(e.dev)).expect(200);
    const rechazada = await alta('rechazada-avisos@test.local');
    await e.api().post(`/api/cuentas/${rechazada}/rechazar`).set(auth(e.dev)).expect(200);
    expect(await avisos()).toEqual([
      { telefono: '011 15 4444-0001', plantilla: 'freedeli_alta_aprobada', parametros: ['Sofía', 'https://riders.freedeli.com.ar'] },
      { telefono: '011 15 4444-0001', plantilla: 'freedeli_alta_rechazada', parametros: ['Sofía'] },
    ]);
  });

  it('pedido nuevo, kiosco que lo rechaza y kiosco que lo aprueba', async () => {
    const p = (await e.api().post('/api/pedidos').set(auth(e.usuario)).send({ kioscoId: e.kioscoId, items: [{ productoId: e.coca.id, cantidad: 6 }], ubicacion: GPS_CLIENTE }).expect(201)).body;
    await e.api().post(`/api/kiosco/pedidos/${p.id}/stock`).set(auth(e.kiosco)).send({ faltantes: [] }).expect(200);
    await e.api().post(`/api/kiosco/pedidos/${p.id}/transferencia`).set(auth(e.kiosco)).expect(200);
    await app.get(DespachoService).barrer();
    const [nuevo] = await avisos();
    expect(nuevo).toEqual({ telefono: '11 5555-0142', plantilla: 'freedeli_pedido_nuevo', parametros: ['Kiosco avisos', 'San Miguel', '$3.000', '60', 'https://riders.freedeli.com.ar'] });

    await e.api().post(`/api/rider/ofertas/${p.id}/aceptar`).set(auth(e.rider)).expect(200);
    enviar.mockClear();
    await e.api().post(`/api/kiosco/pedidos/${p.id}/aprobar-rider`).set(auth(e.kiosco)).send({ aprobado: false }).expect(200);
    expect(await avisos()).toEqual([{ telefono: '11 5555-0142', plantilla: 'freedeli_pedido_rechazado', parametros: [`#A-${p.numero}`] }]);

    // Al mismo rider no se lo vuelve a ofrecer: entra otro y lo aprueban.
    const otro = await db.rider.findFirstOrThrow({ where: { cuenta: { email: 'aprobada-avisos@test.local' } } });
    await db.rider.update({ where: { id: otro.id }, data: { disponible: true, zonas: ['SAN_MIGUEL'] } });
    enviar.mockClear();
    await app.get(DespachoService).barrer();
    expect((await avisos()).map((a) => a.plantilla)).toEqual(['freedeli_pedido_nuevo']);
    const tokenOtro = (await e.api().post('/api/auth/ingresar').send({ email: 'aprobada-avisos@test.local', clave: 'claveRider1' }).expect(200)).body.token;
    await e.api().post(`/api/rider/ofertas/${p.id}/aceptar`).set(auth(tokenOtro)).expect(200);
    enviar.mockClear();
    await e.api().post(`/api/kiosco/pedidos/${p.id}/aprobar-rider`).set(auth(e.kiosco)).send({ aprobado: true }).expect(200);
    expect(await avisos()).toEqual([{ telefono: '011 15 4444-0001', plantilla: 'freedeli_pedido_aprobado', parametros: ['Kiosco avisos', `#A-${p.numero}`, 'Belgrano 980'] }]);
  });

  it('el rider que apagó los avisos no los recibe', async () => {
    await e.api().patch('/api/rider/perfil').set(auth(e.rider)).send({ notificaciones: false }).expect(200);
    const p = (await e.api().post('/api/pedidos').set(auth(e.usuario)).send({ kioscoId: e.kioscoId, items: [{ productoId: e.coca.id, cantidad: 6 }], ubicacion: GPS_CLIENTE }).expect(201)).body;
    await e.api().post(`/api/kiosco/pedidos/${p.id}/stock`).set(auth(e.kiosco)).send({ faltantes: [] }).expect(200);
    await e.api().post(`/api/kiosco/pedidos/${p.id}/transferencia`).set(auth(e.kiosco)).expect(200);
    await app.get(DespachoService).barrer();
    expect((await e.api().get('/api/rider/oferta').set(auth(e.rider)).expect(200)).body.pedidoId).toBe(p.id);
    expect(await avisos()).toEqual([]);
    await e.api().patch('/api/rider/perfil').set(auth(e.rider)).send({ notificaciones: true }).expect(200);
  });
});
