import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { crearApp } from './app.js';

describe('Auth y altas', () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await crearApp();
  });
  afterAll(async () => {
    await app.close();
  });

  const usuario = {
    email: 'martina@test.local',
    clave: 'claveSegura1',
    nombre: 'Martina Rodríguez',
    dni: '40.111.555',
    telefono: '+54 9 11 5555-0199',
    direccion: 'Belgrano 845',
    notas: 'Depto 2B',
    zona: 'san-miguel',
  };

  it('un usuario se registra aprobado y puede ingresar', async () => {
    const r = await api().post('/api/auth/registro/usuario').send(usuario).expect(201);
    expect(r.body.cuenta).toMatchObject({ email: usuario.email, rol: 'USUARIO', estado: 'APROBADA' });
    expect(r.body.token).toEqual(expect.any(String));

    const login = await api().post('/api/auth/ingresar').send({ email: 'MARTINA@test.local', clave: usuario.clave }).expect(200);
    await api().get('/api/auth/yo').set('Authorization', `Bearer ${login.body.token}`).expect(200).expect((res) => {
      expect(res.body.cuenta).toMatchObject({ rol: 'USUARIO', estado: 'APROBADA' });
      expect(res.body.token).toEqual(expect.any(String));
    });
  });

  it('no permite emails repetidos ni datos inválidos', async () => {
    await api().post('/api/auth/registro/usuario').send(usuario).expect(409);
    const r = await api().post('/api/auth/registro/usuario').send({ ...usuario, email: 'otro@test.local', clave: 'corta', zona: 'palermo' }).expect(400);
    expect(r.body.message).toEqual(expect.arrayContaining(['La contraseña tiene que tener al menos 8 caracteres.', 'Zona inválida.']));
  });

  it('la contraseña incorrecta no da pistas', async () => {
    const a = await api().post('/api/auth/ingresar').send({ email: usuario.email, clave: 'otraClave99' }).expect(401);
    const b = await api().post('/api/auth/ingresar').send({ email: 'nadie@test.local', clave: 'otraClave99' }).expect(401);
    expect(a.body.message).toBe(b.body.message);
  });

  it('un kiosco queda pendiente hasta que Dev lo aprueba', async () => {
    const reg = await api()
      .post('/api/auth/registro/kiosco')
      .send({ email: 'faro@test.local', clave: 'claveKiosco1', nombre: 'Kiosco El Faro', direccion: 'Av. Pres. Perón 1420', zona: 'san-miguel', aliasCobro: 'elfaro.kiosco' })
      .expect(201);
    expect(reg.body.cuenta.estado).toBe('PENDIENTE');
    const tokenKiosco = reg.body.token;
    await api().get('/api/auth/yo').set('Authorization', `Bearer ${tokenKiosco}`).expect(200);

    // Solo Dev ve las altas pendientes.
    await api().get('/api/cuentas/pendientes').set('Authorization', `Bearer ${tokenKiosco}`).expect(403);
    const dev = await api().post('/api/auth/ingresar').send({ email: 'dev@test.local', clave: 'clave-dev-123' }).expect(200);
    const tokenDev = dev.body.token;
    const pendientes = await api().get('/api/cuentas/pendientes').set('Authorization', `Bearer ${tokenDev}`).expect(200);
    const alta = pendientes.body.find((c: { email: string }) => c.email === 'faro@test.local');
    expect(alta.kiosco).toMatchObject({ nombre: 'Kiosco El Faro', zona: 'SAN_MIGUEL' });

    await api().post(`/api/cuentas/${alta.id}/aprobar`).set('Authorization', `Bearer ${tokenDev}`).expect(200);
    // Con el token viejo (pendiente) no puede operar; /auth/yo le da uno nuevo ya aprobado.
    await api().get('/api/kiosco').set('Authorization', `Bearer ${tokenKiosco}`).expect(403);
    const renovado = await api().get('/api/auth/yo').set('Authorization', `Bearer ${tokenKiosco}`).expect(200);
    expect(renovado.body.cuenta.estado).toBe('APROBADA');
    await api().get('/api/kiosco').set('Authorization', `Bearer ${renovado.body.token}`).expect(200);
    const login = await api().post('/api/auth/ingresar').send({ email: 'faro@test.local', clave: 'claveKiosco1' }).expect(200);
    expect(login.body.cuenta.estado).toBe('APROBADA');
  });

  it('un rider pendiente no puede operar', async () => {
    const reg = await api()
      .post('/api/auth/registro/rider')
      .send({ email: 'lucas@test.local', clave: 'claveRider1', nombre: 'Lucas Romero', telefono: '11 5555-0142', dni: '38456123', vehiculoModelo: 'Honda Wave 110', patente: 'a123bcd', aliasCbu: 'lucas.rider.fd' })
      .expect(201);
    expect(reg.body.cuenta).toMatchObject({ rol: 'RIDER', estado: 'PENDIENTE' });
    const r = await api().get('/api/cuentas/pendientes').set('Authorization', `Bearer ${reg.body.token}`).expect(403);
    expect(r.body.message).toBe('Tu cuenta está esperando la aprobación de FreeDeli.');
  });

  it('la salud responde sin sesión', async () => {
    await api().get('/api/salud').expect(200).expect({ ok: true });
  });

  it('sin token no hay acceso', async () => {
    await api().get('/api/auth/yo').expect(401);
    await api().get('/api/auth/yo').set('Authorization', 'Bearer cualquiera').expect(401);
  });
});
