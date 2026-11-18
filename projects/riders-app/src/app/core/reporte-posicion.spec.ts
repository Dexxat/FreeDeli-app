import { TestBed } from '@angular/core/testing';
import { Gps, MockDb, RIDER_ACTUAL_ID, UBICACION_MOCK, Ubicacion, provideFreeDeliMocks } from '@freedeli/shared';
import { Observable, throwError } from 'rxjs';
import { MS_REINTENTO_GPS, ReportePosicion } from './reporte-posicion';

describe('ReportePosicion (Riders)', () => {
  let db: MockDb;
  const enCurso = () => db.pedidos().find((p) => p.riderId === RIDER_ACTUAL_ID && p.estado === 'retirado')!;
  afterEach(() => vi.useRealTimers());

  function iniciar(gps?: Partial<Gps>) {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0 }), ...(gps ? [{ provide: Gps, useValue: gps }] : [])] });
    db = TestBed.inject(MockDb);
    expect(enCurso().posicionRider).toBeUndefined();
    TestBed.inject(ReportePosicion);
  }

  it('con un pedido en curso manda la posición del GPS', async () => {
    iniciar();
    await vi.waitFor(() => expect(enCurso().posicionRider).toMatchObject(UBICACION_MOCK));
  });

  it('si el GPS falla (sin señal o con la app atrás), vuelve a intentar en vez de dejar de mandar', async () => {
    vi.useFakeTimers();
    let intentos = 0;
    iniciar({ seguir: () => (++intentos === 1 ? throwError(() => 'no-disponible') : new Observable<Ubicacion>((s) => s.next(UBICACION_MOCK))) });
    await vi.advanceTimersByTimeAsync(100);
    expect(enCurso().posicionRider).toBeUndefined();
    await vi.advanceTimersByTimeAsync(MS_REINTENTO_GPS);
    expect(intentos).toBe(2);
    expect(enCurso().posicionRider).toMatchObject(UBICACION_MOCK);
  });

  it('al volver a la app (por ejemplo desde Google Maps) manda la posición en el momento', async () => {
    const enLaPuerta = { lat: -34.55, lng: -58.7 };
    let pidioPosicion = false;
    iniciar({ seguir: () => new Observable<Ubicacion>(() => void (pidioPosicion = true)), posicion: () => Promise.resolve(enLaPuerta) });
    // Espera a que esté siguiendo el pedido en curso (GPS pedido) antes de "volver" a la app.
    await vi.waitFor(() => expect(pidioPosicion).toBe(true));
    expect(enCurso().posicionRider).toBeUndefined();
    document.dispatchEvent(new Event('visibilitychange'));
    await vi.waitFor(() => expect(enCurso().posicionRider).toMatchObject(enLaPuerta));
  });
});
