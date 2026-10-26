import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideFreeDeliMocks } from '@freedeli/shared';
import Kioscos, { inicialKiosco } from './kioscos';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Kioscos (Usuarios)', () => {
  it('saca la inicial del nombre', () => {
    expect(inicialKiosco('Kiosco El Faro')).toBe('F');
    expect(inicialKiosco('Maxikiosco 24')).toBe('2');
    expect(inicialKiosco('Drugstore Bella')).toBe('B');
  });

  async function abrir(url: string) {
    TestBed.configureTestingModule({
      providers: [
        provideFreeDeliMocks({ latencia: 0, simulacionRider: null }),
        provideRouter([{ path: 'pedir', component: Kioscos }], withComponentInputBinding()),
      ],
    });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    for (let i = 0; i < 3; i++) {
      await esperar();
      await harness.fixture.whenStable();
    }
    return harness;
  }

  const nombres = (el: HTMLElement) => [...el.querySelectorAll('.nombre')].map((n) => n.textContent?.trim());

  it('muestra todos los kioscos abiertos, sin el cerrado', async () => {
    const h = await abrir('/pedir');
    const el = h.routeNativeElement!;
    expect(nombres(el)).toEqual(['Kiosco El Faro', 'Maxikiosco 24', 'Kiosco La Estación', 'Drugstore Bella']);
    expect(el.querySelector('[aria-pressed=true]')?.textContent?.trim()).toBe('Todas');
    expect(el.textContent).toContain('20–30 min');
    expect(el.textContent).toContain('Envío $1.500');
  });

  it('filtra por zona desde la URL', async () => {
    const h = await abrir('/pedir?zona=muniz');
    const el = h.routeNativeElement!;
    expect(nombres(el)).toEqual(['Kiosco La Estación']);
    expect(el.querySelector('[aria-pressed=true]')?.textContent?.trim()).toBe('Muñiz');
  });

  it('al tocar un filtro cambia la lista', async () => {
    const h = await abrir('/pedir');
    const el = h.routeNativeElement!;
    [...el.querySelectorAll<HTMLButtonElement>('.filtros button')].find((b) => b.textContent?.trim() === 'Bella Vista')!.click();
    for (let i = 0; i < 4; i++) {
      await esperar();
      await h.fixture.whenStable();
    }
    expect(nombres(h.routeNativeElement!)).toEqual(['Drugstore Bella']);
  });
});
