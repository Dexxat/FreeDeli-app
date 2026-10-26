import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_URL } from './api-url';
import { requiereSesion } from './guard';
import { SesionService } from './sesion';

describe('Sesión y guard', () => {
  beforeEach(() => localStorage.clear());

  it('guarda y recupera la sesión', () => {
    TestBed.configureTestingModule({});
    const s = TestBed.inject(SesionService);
    s.iniciar({ token: 't', cuenta: { id: 'c', email: 'a@b.c', rol: 'USUARIO', estado: 'APROBADA' } });
    expect(JSON.parse(localStorage.getItem('freedeli.sesion')!).token).toBe('t');
    s.cerrar();
    expect(localStorage.getItem('freedeli.sesion')).toBeNull();
  });

  function correrGuard(conApi: boolean) {
    TestBed.configureTestingModule({ providers: [provideRouter([]), ...(conApi ? [{ provide: API_URL, useValue: 'x' }] : [])] });
    return TestBed.runInInjectionContext(() => requiereSesion('USUARIO')({} as never, {} as never));
  }

  it('con mocks deja pasar', () => {
    expect(correrGuard(false)).toBe(true);
  });

  it('con API pide ingresar, y una cuenta pendiente va a /pendiente', () => {
    const sinSesion = correrGuard(true);
    const router = TestBed.inject(Router);
    expect(router.serializeUrl(sinSesion as never)).toBe('/ingresar');
    TestBed.inject(SesionService).iniciar({ token: 't', cuenta: { id: 'c', email: 'a@b.c', rol: 'USUARIO', estado: 'PENDIENTE' } });
    const pendiente = TestBed.runInInjectionContext(() => requiereSesion('USUARIO')({} as never, {} as never));
    expect(router.serializeUrl(pendiente as never)).toBe('/pendiente');
  });
});
