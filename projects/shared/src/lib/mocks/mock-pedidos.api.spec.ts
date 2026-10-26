import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { PedidosApi } from '../api/pedidos.api';
import { RidersApi } from '../api/riders.api';
import { MockDb, RIDER_ACTUAL_ID } from './mock-db';
import { provideFreeDeliMocks } from './provide-mocks';

describe('Mocks de FreeDeli', () => {
  let pedidos: PedidosApi;
  let riders: RidersApi;
  let db: MockDb;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks()] });
    pedidos = TestBed.inject(PedidosApi);
    riders = TestBed.inject(RidersApi);
    db = TestBed.inject(MockDb);
  });

  function enCurso() {
    return db.pedidos().find((p) => p.riderId === RIDER_ACTUAL_ID && p.estado === 'retirado')!;
  }

  it('hay un pedido en curso para el rider', () => {
    expect(enCurso()).toBeDefined();
  });

  it('confirma la entrega solo con el PIN correcto y desde En camino', async () => {
    const p = enCurso();
    expect(await firstValueFrom(pedidos.confirmarEntrega(p.id, p.pin))).toEqual({ ok: false, motivo: 'estado-invalido' });

    await firstValueFrom(pedidos.avanzarEstado(p.id));
    const pinMalo = p.pin === '0000' ? '1111' : '0000';
    expect(await firstValueFrom(pedidos.confirmarEntrega(p.id, pinMalo))).toEqual({ ok: false, motivo: 'pin-incorrecto' });

    const r = await firstValueFrom(pedidos.confirmarEntrega(p.id, p.pin));
    expect(r.ok).toBe(true);
    expect(db.pedidos().find((x) => x.id === p.id)!.estado).toBe('entregado');
  });

  it('no permite dejar al rider sin zonas', async () => {
    await expect(firstValueFrom(riders.setZonas([]))).rejects.toThrow('Elegí al menos una zona.');
  });

  it('el rider disponible suma a los riders activos de sus zonas', async () => {
    const antes = (await firstValueFrom(riders.demanda())).find((d) => d.zona === 'san-miguel')!.ridersActivos;
    await firstValueFrom(riders.setDisponible(true));
    const despues = (await firstValueFrom(riders.demanda())).find((d) => d.zona === 'san-miguel')!.ridersActivos;
    expect(despues).toBe(antes + 1);
  });

  it('el historial solo trae entregados y cancelados del rider, del más nuevo al más viejo', async () => {
    const lista = await firstValueFrom(riders.historial('mes'));
    expect(lista.every((p) => p.riderId === RIDER_ACTUAL_ID && ['entregado', 'cancelado'].includes(p.estado))).toBe(true);
    for (let i = 1; i < lista.length; i++) {
      expect(lista[i - 1].creadoEn.getTime()).toBeGreaterThanOrEqual(lista[i].creadoEn.getTime());
    }
  });
});

describe('Coherencia Historial / Ganancias', () => {
  it('la jornada y el historial de hoy cuentan los mismos pedidos entregados', async () => {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0 })] });
    const riders = TestBed.inject(RidersApi);
    const historial = await firstValueFrom(riders.historial('hoy'));
    const ganancias = await firstValueFrom(riders.ganancias('jornada'));
    expect(ganancias.cantidadPedidos).toBe(historial.filter((p) => p.estado === 'entregado').length);
    const total = historial.reduce((a, p) => a + (p.estado === 'entregado' ? p.gananciaRider + p.propina : 0), 0);
    expect(ganancias.total).toBe(total);
  });
});
