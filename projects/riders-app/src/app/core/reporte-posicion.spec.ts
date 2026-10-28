import { TestBed } from '@angular/core/testing';
import { MockDb, RIDER_ACTUAL_ID, UBICACION_MOCK, provideFreeDeliMocks } from '@freedeli/shared';
import { ReportePosicion } from './reporte-posicion';

const esperar = () => new Promise((r) => setTimeout(r, 10));

describe('ReportePosicion (Riders)', () => {
  it('con un pedido en curso manda la posición del GPS', async () => {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0 })] });
    const db = TestBed.inject(MockDb);
    const enCurso = () => db.pedidos().find((p) => p.riderId === RIDER_ACTUAL_ID && p.estado === 'retirado')!;
    expect(enCurso().posicionRider).toBeUndefined();

    TestBed.inject(ReportePosicion);
    await esperar();
    expect(enCurso().posicionRider).toMatchObject(UBICACION_MOCK);
  });
});
