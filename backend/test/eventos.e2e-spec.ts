import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp } from './app.js';

/** Lee eventos SSE de una respuesta hasta que `listo` devuelva true. */
async function leerEventos(url: string, listo: (eventos: { type: string; data: unknown }[]) => boolean, ms = 5000) {
  const ctrl = new AbortController();
  const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: 'text/event-stream' } });
  const lector = res.body!.getReader();
  const eventos: { type: string; data: unknown }[] = [];
  const decoder = new TextDecoder();
  let buffer = '';
  const limite = setTimeout(() => ctrl.abort(), ms);
  try {
    while (!listo(eventos)) {
      const { value, done } = await lector.read();
      if (done) break;
      buffer += decoder.decode(value);
      let corte: number;
      while ((corte = buffer.indexOf('\n\n')) >= 0) {
        const bloque = buffer.slice(0, corte);
        buffer = buffer.slice(corte + 2);
        const type = /^event: (.*)$/m.exec(bloque)?.[1] ?? 'message';
        const data = /^data: (.*)$/m.exec(bloque)?.[1];
        if (data) eventos.push({ type, data: JSON.parse(data) });
      }
    }
  } catch {
    // Se cortó por tiempo.
  } finally {
    clearTimeout(limite);
    ctrl.abort();
  }
  return eventos;
}

describe('Eventos en tiempo real (SSE)', () => {
  let app: INestApplication;
  let base: string;
  const api = () => request(app.getHttpServer());
  const auth = (t: string) => ({ Authorization: `Bearer ${t}` });

  beforeAll(async () => {
    app = await crearApp();
    await app.listen(0);
    base = `http://127.0.0.1:${(app.getHttpServer().address() as { port: number }).port}`;
  });
  afterAll(async () => {
    await app.close();
  });

  it('el usuario recibe los cambios de su pedido y no los de otros', async () => {
    const dev = (await api().post('/api/auth/ingresar').send({ email: 'dev@test.local', clave: 'clave-dev-123' })).body.token;
    await api().post('/api/auth/registro/kiosco').send({ email: 'k@sse.local', clave: 'claveKiosco1', nombre: 'Kiosco SSE', direccion: 'Mitre 100', zona: 'muniz', aliasCobro: 'kiosco.sse' }).expect(201);
    const pend = (await api().get('/api/cuentas/pendientes').set(auth(dev))).body;
    await api().post(`/api/cuentas/${pend.find((c: { email: string }) => c.email === 'k@sse.local').id}/aprobar`).set(auth(dev)).expect(200);
    const kiosco = (await api().post('/api/auth/ingresar').send({ email: 'k@sse.local', clave: 'claveKiosco1' })).body.token;
    const kioscoId = (await api().get('/api/kiosco').set(auth(kiosco))).body.id;
    await api().post(`/api/admin/kioscos/${kioscoId}/saldo`).set(auth(dev)).send({ monto: 5000 }).expect(200);
    const prod = (await api().post('/api/kiosco/productos').set(auth(kiosco)).send({ nombre: 'Fernet 750 ml', precio: 9000 })).body;

    const registrar = async (email: string) =>
      (await api().post('/api/auth/registro/usuario').send({ email, clave: 'claveUsuario1', nombre: 'Ana P', telefono: '11 5555-0101', direccion: 'Pringles 210', zona: 'muniz' }).expect(201)).body.token;
    const ana = await registrar('ana@sse.local');
    const otro = await registrar('otro@sse.local');
    const pedido = (await api().post('/api/pedidos').set(auth(ana)).send({ kioscoId, items: [{ productoId: prod.id, cantidad: 2 }] }).expect(201)).body;

    const deAna = leerEventos(`${base}/api/eventos?token=${ana}`, (es) => es.some((e) => (e.data as { pedido?: { fase?: string } }).pedido?.fase === 'transferencia'));
    const deOtro = leerEventos(`${base}/api/eventos?token=${otro}`, () => false, 1500);
    await new Promise((r) => setTimeout(r, 300));
    await api().post(`/api/kiosco/pedidos/${pedido.id}/stock`).set(auth(kiosco)).send({ faltantes: [] }).expect(200);

    const eventosAna = await deAna;
    expect(eventosAna.at(-1)).toMatchObject({ type: 'pedido', data: { pedido: { id: pedido.id, fase: 'transferencia' } } });
    expect(await deOtro).toEqual([]);
  });

  it('sin token no hay eventos', async () => {
    const res = await fetch(`${base}/api/eventos`);
    expect(res.status).toBe(401);
  });
});
