import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { KioscosApi } from '../api/kioscos.api';
import { UsuariosApi } from '../api/usuarios.api';
import { KIOSCO_ACTUAL_ID, MockDb } from './mock-db';
import { provideFreeDeliMocks } from './provide-mocks';

describe('MockKioscosApi', () => {
  let api: KioscosApi;
  let db: MockDb;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0 })] });
    api = TestBed.inject(KioscosApi);
    db = TestBed.inject(MockDb);
  });

  it('historial: solo terminados del kiosco', async () => {
    const h = await firstValueFrom(api.historial('mes'));
    expect(h.length).toBeGreaterThan(0);
    expect(h.every((p) => p.kioscoId === KIOSCO_ACTUAL_ID && ['entregado', 'cancelado'].includes(p.estado))).toBe(true);
  });

  it('ganancias: cobrado = envíos + comisiones + neto, y las barras suman el neto', async () => {
    const g = await firstValueFrom(api.ganancias('mes'));
    expect(g.envios + g.comisiones + g.neto - g.premios).toBe(g.cobrado);
    expect(g.barras.reduce((a, b) => a + b.monto, 0)).toBe(g.neto);
  });

  it('valida y guarda los datos del kiosco', async () => {
    await expect(firstValueFrom(api.actualizarDatos({ nombre: 'K', direccion: 'Sin altura', aliasCobro: 'x', tiempoEstimadoMin: 2 }))).rejects.toThrow();
    const k = await firstValueFrom(api.actualizarDatos({ nombre: 'El Faro 24', direccion: 'Av. Pres. Perón 1420', aliasCobro: 'faro.nuevo', tiempoEstimadoMin: 20 }));
    expect(k).toMatchObject({ nombre: 'El Faro 24', aliasCobro: 'faro.nuevo', tiempoEstimadoMin: 20 });
  });

  it('un producto sin stock no aparece para los usuarios', async () => {
    const coca = db.productos().find((p) => p.id === 'k1-p1')!;
    await firstValueFrom(api.guardarProducto({ ...coca, disponible: false }));
    const paraUsuario = await firstValueFrom(TestBed.inject(UsuariosApi).productos('k1'));
    expect(paraUsuario.map((p) => p.id)).not.toContain('k1-p1');
    const nuevo = await firstValueFrom(api.guardarProducto({ nombre: 'Fernet 750 ml', precio: 9500, disponible: true }));
    expect((await firstValueFrom(api.catalogo())).map((p) => p.id)).toContain(nuevo.id);
    await expect(firstValueFrom(api.guardarProducto({ nombre: 'X', precio: 0, disponible: true }))).rejects.toThrow();
  });
});
