import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideFreeDeliMocks } from '@freedeli/shared';
import { App } from './app';
import { routes } from './app.routes';

describe('App (shell de Kioscos)', () => {
  it('muestra las 4 secciones', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: [provideRouter(routes), provideFreeDeliMocks({ latencia: 0 })] });
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav a')].map((a) => a.textContent?.trim());
    expect(links).toEqual(['INICIO', 'GANANCIAS', 'PEDIDOS', 'AJUSTES']);
  });
});
