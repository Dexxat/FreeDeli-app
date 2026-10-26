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
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0, simulacionRider: null })] });
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
});
