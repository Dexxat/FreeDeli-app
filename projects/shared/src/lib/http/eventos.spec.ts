import { TestBed } from '@angular/core/testing';
import { Subscription } from 'rxjs';
import { API_URL } from './api-url';
import { EventoApi, EventosCliente, MS_SIN_LATIDO } from './eventos';
import { SesionService } from './sesion';

/** EventSource de mentira: guarda cada conexión abierta para dispararle eventos. */
class FuenteFalsa {
  static abiertas: FuenteFalsa[] = [];
  static readonly CLOSED = 2;
  readyState = 1;
  onopen?: () => void;
  private readonly oyentes = new Map<string, (m: { data: string }) => void>();

  constructor(readonly url: string) {
    FuenteFalsa.abiertas.push(this);
  }
  addEventListener(tipo: string, f: (m: { data: string }) => void) {
    this.oyentes.set(tipo, f);
  }
  close() {
    this.readyState = FuenteFalsa.CLOSED;
  }
  disparar(tipo: string, data: object = {}) {
    this.oyentes.get(tipo)?.({ data: JSON.stringify(data) });
  }
}

describe('EventosCliente', () => {
  let recibidos: EventoApi[];
  let sub: Subscription;
  const ultima = () => FuenteFalsa.abiertas.at(-1)!;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('EventSource', FuenteFalsa);
    FuenteFalsa.abiertas = [];
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [{ provide: API_URL, useValue: 'https://api' }] });
    TestBed.inject(SesionService).iniciar({ token: 't', cuenta: { id: 'c', email: 'a@b.c', rol: 'RIDER', estado: 'APROBADA' } });
    recibidos = [];
    sub = TestBed.inject(EventosCliente).eventos$.subscribe((e) => recibidos.push(e));
    TestBed.tick();
    ultima().onopen?.();
  });

  afterEach(() => {
    sub.unsubscribe();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('con latidos del servidor mantiene la misma conexión', () => {
    for (let s = 0; s < 120; s += 25) {
      vi.advanceTimersByTime(25_000);
      ultima().disparar('latido');
    }
    expect(FuenteFalsa.abiertas).toHaveLength(1);
  });

  it('si el servidor deja de latir, reconecta y avisa para volver a pedir el estado', () => {
    vi.advanceTimersByTime(MS_SIN_LATIDO + 15_000);
    expect(FuenteFalsa.abiertas).toHaveLength(2);
    ultima().onopen?.();
    expect(recibidos.filter((e) => e.tipo === 'conexion')).toHaveLength(2);
  });

  it('al volver a la app (por ejemplo desde Google Maps) reconecta si la conexión quedó cortada', () => {
    ultima().close();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(FuenteFalsa.abiertas).toHaveLength(2);
  });

  it('al volver la señal reconecta', () => {
    window.dispatchEvent(new Event('online'));
    expect(FuenteFalsa.abiertas).toHaveLength(2);
    expect(FuenteFalsa.abiertas[0].readyState).toBe(FuenteFalsa.CLOSED);
  });
});
