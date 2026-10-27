import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideFreeDeliMocks } from '@freedeli/shared';
import Inicio from './inicio';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Inicio (Riders)', () => {
  let fixture: ComponentFixture<Inicio>;
  let el: HTMLElement;

  async function estable() {
    await esperar();
    await fixture.whenStable();
    await esperar();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Inicio], providers: [provideFreeDeliMocks({ latencia: 0 })] });
    fixture = TestBed.createComponent(Inicio);
    el = fixture.nativeElement;
    await estable();
  });

  const zonas = () => [...el.querySelectorAll<HTMLButtonElement>('button.zona')];
  const chances = () => zonas().map((b) => b.querySelector('.chance')!.textContent!.trim());
  const interruptor = () => el.querySelector<HTMLButtonElement>('button.interruptor')!;

  it('muestra las 3 zonas, con San Miguel al 100 %', () => {
    expect(zonas().map((b) => b.querySelector('.nombre')!.textContent!.trim())).toEqual(['San Miguel', 'Muñiz', 'Bella Vista']);
    expect(chances()).toEqual(['100%', '—', '—']);
  });

  it('reparte 50 / 50 y 34 / 33 / 33 al sumar zonas', async () => {
    zonas()[2].click();
    await estable();
    expect(chances()).toEqual(['50%', '—', '50%']);
    zonas()[1].click();
    await estable();
    expect(chances()).toEqual(['34%', '33%', '33%']);
  });

  it('no deja quitar la última zona y avisa', async () => {
    zonas()[0].click();
    await estable();
    expect(chances()).toEqual(['100%', '—', '—']);
    expect(el.querySelector('[role=alert]')?.textContent).toContain('al menos una zona');
  });

  it('el interruptor pasa de OFF a ON y suma al rider en su zona', async () => {
    const ridersAntes = Number(zonas()[0].querySelectorAll('.valor')[1].textContent);
    expect(interruptor().textContent).toContain('OFF');
    interruptor().click();
    // La demanda se vuelve a pedir después del cambio: se espera a que llegue, sin tiempos fijos.
    await vi.waitFor(async () => {
      await fixture.whenStable();
      expect(interruptor().textContent).toContain('ON');
      expect(interruptor().getAttribute('aria-pressed')).toBe('true');
      expect(Number(zonas()[0].querySelectorAll('.valor')[1].textContent)).toBe(ridersAntes + 1);
    });
  });
});
