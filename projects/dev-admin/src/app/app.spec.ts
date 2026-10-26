import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MockDb, provideFreeDeliMocks } from '@freedeli/shared';
import { App } from './app';
import { routes } from './app.routes';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('FreeDeli Dev', () => {
  let h: RouterTestingHarness;

  async function abrir(url: string) {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes, withComponentInputBinding()), provideFreeDeliMocks({ latencia: 0, simulacionRider: null })],
    });
    h = await RouterTestingHarness.create();
    await h.navigateByUrl(url);
    for (let i = 0; i < 4; i++) {
      await esperar();
      await h.fixture.whenStable();
    }
    return h.routeNativeElement!;
  }

  async function estable() {
    for (let i = 0; i < 4; i++) {
      await esperar();
      await h.fixture.whenStable();
    }
  }

  it('el resumen muestra las ganancias del día y la alerta de saldo bajo', async () => {
    const el = await abrir('/resumen');
    expect(el.textContent).toContain('Ganancias FreeDeli');
    expect(el.textContent).toContain('Kiosco Pixel tiene saldo bajo');
  });

  it('la lista de kioscos permite pausar y reactivar', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const el = await abrir('/kioscos');
    const db = TestBed.inject(MockDb);
    const fila = [...el.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.includes('Kiosco El Faro'))!;
    fila.querySelector<HTMLButtonElement>('button')!.click();
    await estable();
    expect(db.kioscos().find((k) => k.id === 'k1')!.pausado).toBe(true);
    expect(fila.textContent).toContain('Pausado');
    fila.querySelector<HTMLButtonElement>('button')!.click();
    await estable();
    expect(db.kioscos().find((k) => k.id === 'k1')!.pausado).toBe(false);
  });

  it('el detalle del kiosco muestra movimientos que cuadran', async () => {
    const el = await abrir('/kioscos/k1');
    [...el.querySelectorAll<HTMLButtonElement>('.filtros button')].find((b) => b.textContent?.trim() === 'Mes')!.click();
    await estable();
    const filas = el.querySelectorAll('tbody tr');
    expect(filas.length).toBeGreaterThan(0);
    const total = [...el.querySelectorAll('tfoot td')].map((td) => Number(td.textContent!.replace(/\D/g, '')));
    expect(total[1] + total[2] + total[3]).toBe(total[0]);
  });
});
