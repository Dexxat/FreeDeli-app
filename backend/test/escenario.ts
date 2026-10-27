import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DespachoService } from '../src/pedidos/despacho.service.js';

export const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

/**
 * Arma un escenario con un kiosco con saldo y catálogo, un rider ON y un usuario.
 * `sufijo` evita choques de email entre archivos de test que comparten la base.
 */
export async function armarEscenario(app: INestApplication, sufijo: string) {
  const api = () => request(app.getHttpServer());
  const ingresar = async (email: string, clave: string) => (await api().post('/api/auth/ingresar').send({ email, clave }).expect(200)).body.token as string;
  const dev = await ingresar('dev@test.local', 'clave-dev-123');
  const aprobar = async (email: string) => {
    const pend = await api().get('/api/cuentas/pendientes').set(auth(dev)).expect(200);
    await api().post(`/api/cuentas/${pend.body.find((c: { email: string }) => c.email === email).id}/aprobar`).set(auth(dev)).expect(200);
  };

  const emailK = `k-${sufijo}@test.local`;
  await api().post('/api/auth/registro/kiosco').send({ email: emailK, clave: 'claveKiosco1', nombre: `Kiosco ${sufijo}`, direccion: 'Belgrano 980', zona: 'san-miguel', aliasCobro: 'kiosco.prueba' }).expect(201);
  await aprobar(emailK);
  const kiosco = await ingresar(emailK, 'claveKiosco1');
  const kioscoId = (await api().get('/api/kiosco').set(auth(kiosco))).body.id as string;
  await api().post(`/api/admin/kioscos/${kioscoId}/saldo`).set(auth(dev)).send({ monto: 30000, referencia: 'Op. inicial' }).expect(200);
  const coca = (await api().post('/api/kiosco/productos').set(auth(kiosco)).send({ nombre: 'Coca-Cola 1,5 L', precio: 2800 }).expect(201)).body;

  const emailR = `r-${sufijo}@test.local`;
  await api().post('/api/auth/registro/rider').send({ email: emailR, clave: 'claveRider1', nombre: 'Lucas Romero', telefono: '11 5555-0142', dni: '38456123', vehiculoModelo: 'Honda Wave 110', patente: 'A123BCD', aliasCbu: 'lucas.rider.fd' }).expect(201);
  await aprobar(emailR);
  const rider = await ingresar(emailR, 'claveRider1');
  const riderId = (await api().get('/api/rider').set(auth(rider))).body.id as string;
  await api().patch('/api/rider/estado').set(auth(rider)).send({ disponible: true, zonas: ['san-miguel'] }).expect(200);

  const usuario = (
    await api().post('/api/auth/registro/usuario').send({ email: `u-${sufijo}@test.local`, clave: 'claveUsuario1', nombre: 'Martina Rodríguez', dni: '40111444', telefono: '11 5555-0199', direccion: 'Belgrano 845', zona: 'san-miguel' }).expect(201)
  ).body.token as string;

  /** Hace un pedido de 6 Coca-Cola y lo lleva hasta Entregado. */
  async function pedidoEntregado() {
    const p = (await api().post('/api/pedidos').set(auth(usuario)).send({ kioscoId, items: [{ productoId: coca.id, cantidad: 6 }] }).expect(201)).body;
    await api().post(`/api/kiosco/pedidos/${p.id}/stock`).set(auth(kiosco)).send({ faltantes: [] }).expect(200);
    await api().post(`/api/kiosco/pedidos/${p.id}/transferencia`).set(auth(kiosco)).expect(200);
    await app.get(DespachoService).barrer();
    await api().post(`/api/rider/ofertas/${p.id}/aceptar`).set(auth(rider)).expect(200);
    await api().post(`/api/kiosco/pedidos/${p.id}/aprobar-rider`).set(auth(kiosco)).send({ aprobado: true }).expect(200);
    await api().post(`/api/rider/pedidos/${p.id}/retiro`).set(auth(rider)).expect(200);
    await api().post(`/api/kiosco/pedidos/${p.id}/envio`).set(auth(kiosco)).expect(200);
    await api().post(`/api/rider/pedidos/${p.id}/en-camino`).set(auth(rider)).expect(200);
    return (await api().post(`/api/rider/pedidos/${p.id}/entregar`).set(auth(rider)).send({ pin: p.pin }).expect(200)).body;
  }

  return { api, dev, kiosco, kioscoId, rider, riderId, usuario, coca, pedidoEntregado };
}
