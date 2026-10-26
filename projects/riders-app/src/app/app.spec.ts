import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideFreeDeliMocks } from '@freedeli/shared';
import { App } from './app';
import { routes } from './app.routes';

describe('App (shell de Riders)', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes), provideFreeDeliMocks()],
    }).compileComponents();
  });

  it('muestra las 5 secciones en la navegación inferior', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const links = [...(fixture.nativeElement as HTMLElement).querySelectorAll('nav a')].map((a) => a.textContent?.trim());
    expect(links).toEqual(['INICIO', 'VIVO', 'HISTORIAL', 'GANANCIAS', 'PERFIL']);
  });

  it('arranca OFFLINE', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role=status]')?.textContent).toContain('OFFLINE');
  });
});
