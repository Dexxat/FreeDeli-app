import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AdminApi } from '../api/admin.api';
import { UsuariosApi } from '../api/usuarios.api';
import { MockDb } from './mock-db';
import { provideFreeDeliMocks } from './provide-mocks';

describe('MockAdminApi', () => {
  let admin: AdminApi;
  let db: MockDb;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0 })] });
    admin = TestBed.inject(AdminApi);
    db = TestBed.inject(MockDb);
  });

  it('resume el día con comisiones de pedidos entregados', async () => {
    const r = await firstValueFrom(admin.resumen());
    expect(r.pedidosHoy).toBeGreaterThan(0);
    expect(r.comisionesHoy).toBeGreaterThanOrEqual(r.entregadosHoy * 1500);
    expect(r.kioscosAbiertos).toBe(4);
  });

  it('marca en alerta a los kioscos con saldo bajo', async () => {
    const ks = await firstValueFrom(admin.kioscos());
    expect(ks.find((k) => k.id === 'k5')!.saldoBajo).toBe(true);
    expect(ks.find((k) => k.id === 'k1')!.saldoBajo).toBe(false);
    const r = await firstValueFrom(admin.resumen());
    expect(r.alertas.some((a) => a.tipo === 'saldo-bajo' && a.ruta === '/kioscos/k5')).toBe(true);
  });

  it('pausar un kiosco lo saca de la app de usuarios', async () => {
    await firstValueFrom(admin.pausarKiosco('k1', true));
    const abiertos = await firstValueFrom(TestBed.inject(UsuariosApi).kioscosAbiertos());
    expect(abiertos.map((k) => k.id)).not.toContain('k1');
    await firstValueFrom(admin.pausarKiosco('k1', false));
    expect(db.kioscos().find((k) => k.id === 'k1')!.pausado).toBe(false);
  });

  it('los movimientos cuadran: cliente = rider + FreeDeli + kiosco', async () => {
    const ms = await firstValueFrom(admin.movimientosKiosco('k1', 'mes'));
    expect(ms.length).toBeGreaterThan(0);
    for (const m of ms) expect(m.envioRider + m.comisionFreeDeli + m.netoKiosco).toBe(m.totalCliente);
  });

  it('MAIN: pedidos de la jornada solo de las zonas elegidas', async () => {
    const todas = await firstValueFrom(admin.pedidosJornada(['san-miguel', 'muniz', 'bella-vista']));
    const muniz = await firstValueFrom(admin.pedidosJornada(['muniz']));
    expect(todas.length).toBeGreaterThan(muniz.length);
    expect(muniz.every((f) => f.zona === 'muniz')).toBe(true);
    const enCurso = todas.find((f) => f.estado === 'retirado')!;
    expect(enCurso.riderId).toBe('r1');
    expect(enCurso.riderNombre).toBe('Lucas Romero');
  });

  it('ganancias: suma comisiones de entregados y reparte por zona', async () => {
    const g = await firstValueFrom(admin.ganancias('mes'));
    expect(g.total).toBe(g.porZona.reduce((a, z) => a + z.total, 0));
    expect(g.total).toBe(g.barras.reduce((a, b) => a + b.monto, 0));
    expect(g.pedidos).toBeGreaterThan(0);
  });

  it('entregas: solo finalizadas, con duración', async () => {
    const es = await firstValueFrom(admin.entregas('semana', ['san-miguel']));
    expect(es.length).toBeGreaterThan(0);
    expect(es.every((e) => e.estado === 'entregado' && e.zona === 'san-miguel')).toBe(true);
    expect(es[0].duracionMin).toBeGreaterThan(0);
  });

  it('ficha del rider con su envío en curso y pausa', async () => {
    const r = await firstValueFrom(admin.rider('r1'));
    expect(r!.enCurso?.estado).toBe('retirado');
    expect(r!.entregasHoy).toBeGreaterThan(0);
    const envios = await firstValueFrom(admin.enviosRider('r1', 'jornada'));
    expect(envios.every((e) => e.riderId === 'r1')).toBe(true);

    await firstValueFrom(admin.pausarRider('r2', true));
    expect(db.riders().find((x) => x.id === 'r2')).toMatchObject({ pausado: true, disponible: false });
  });

  it('acredita cargas de saldo y registra las comisiones descontadas', async () => {
    const antes = db.kioscos().find((k) => k.id === 'k5')!.saldo;
    await firstValueFrom(admin.acreditarSaldo('k5', 20000, 'Transf. 123'));
    expect(db.kioscos().find((k) => k.id === 'k5')!.saldo).toBe(antes + 20000);
    const ms = await firstValueFrom(admin.movimientosSaldo('k5'));
    expect(ms[0]).toMatchObject({ tipo: 'carga', monto: 20000, referencia: 'Transf. 123', saldoResultante: antes + 20000 });
    await expect(firstValueFrom(admin.acreditarSaldo('k5', 0, ''))).rejects.toThrow('mayor a cero');
  });
});
