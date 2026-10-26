import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { provideFreeDeliMocks } from '@freedeli/shared';
import { App } from './app';
import { routes } from './app.routes';

describe('App (shell de Usuarios)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideFreeDeliMocks({ latencia: 0 })],
    }).compileComponents();
  });

  it('muestra las 4 secciones y el chip 24 HS en el inicio', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/inicio');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect([...el.querySelectorAll('nav a')].map((a) => a.textContent?.trim())).toEqual(['INICIO', 'PEDIR', 'MI PEDIDO', 'AJUSTES']);
    expect(el.querySelector('.chip')?.textContent).toContain('24 HS');
  });

  it('al armar un pedido muestra "Volver" y oculta la navegación', async () => {
    const fixture = TestBed.createComponent(App);
    await TestBed.inject(Router).navigateByUrl('/pedir/k1');
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.volver')?.getAttribute('href')).toBe('/pedir');
    expect(el.querySelector('nav')).toBeNull();
  });
});
