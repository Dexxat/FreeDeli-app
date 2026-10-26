import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MockDb, provideFreeDeliMocks } from '@freedeli/shared';
import { App } from './app';
import { routes } from './app.routes';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('FreeDeli Dev', () => {
  let h: RouterTestingHarness;

  async function estable() {
    for (let i = 0; i < 5; i++) {
      await esperar();
      await h.fixture.whenStable();
    }
  }

  async function abrir(url: string) {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes, withComponentInputBinding()), provideFreeDeliMocks({ latencia: 0, simulacionRider: null })],
    });
    h = await RouterTestingHarness.create();
    await h.navigateByUrl(url);
    await estable();
    return h.routeNativeElement!;
  }

  const boton = (el: HTMLElement, t: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === t)!;

  it('MAIN muestra los pedidos de la jornada y filtra por zonas', async () => {
    const el = await abrir('/main');
    const todas = el.querySelectorAll('.filas li').length;
    expect(todas).toBeGreaterThan(0);
    expect(el.querySelector('.estado-retirado .derecha .id')?.textContent).toBe('R1');

    await h.navigateByUrl('/main?zonas=muniz');
    await estable();
    const filas = [...h.routeNativeElement!.querySelectorAll('.filas li .detalle')].filter((d) => d.textContent?.includes('·'));
    expect(filas.every((d) => d.textContent?.includes('Muñiz'))).toBe(true);
    expect(h.routeNativeElement!.querySelectorAll('.filas li').length).toBeLessThan(todas);
  });

  it('MAIN no deja deseleccionar la última zona', async () => {
    const el = await abrir('/main?zonas=muniz');
    boton(el, 'Muñiz').click();
    await estable();
    expect(boton(h.routeNativeElement!, 'Muñiz').getAttribute('aria-pressed')).toBe('true');
  });

  it('GANANCIAS cambia de período', async () => {
    const el = await abrir('/ganancias');
    const jornada = el.querySelector('.total-monto')?.textContent;
    boton(el, 'MES').click();
    await estable();
    expect(el.querySelector('.subtitulo')?.textContent).toBe('POR DÍA');
    expect(el.querySelector('.total-monto')?.textContent).not.toBe(jornada);
  });

  it('ENTREGAS lista entregas finalizadas con su detalle de dinero', async () => {
    const el = await abrir('/entregas');
    const items = el.querySelectorAll('.lista > li');
    expect(items.length).toBeGreaterThan(0);
    expect(el.querySelector('details')?.textContent).toContain('Comisión FreeDeli');
  });

  it('desde MAIN se abre la ficha del rider con seguimiento y pausa', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const el = await abrir('/main');
    expect(el.querySelector('a[href="/riders/r1"]')).not.toBeNull();
    expect(el.querySelector('a[href^="/kioscos/k"]')).not.toBeNull();

    await h.navigateByUrl('/riders/r1');
    await estable();
    const ficha = h.routeNativeElement!;
    expect(ficha.querySelector('h1')?.textContent).toContain('R1 · Lucas Romero');
    expect(ficha.querySelector('fd-barra-estado li[aria-current=step]')?.textContent).toContain('Retirado');
    boton(ficha, 'Pausar').click();
    await estable();
    expect(TestBed.inject(MockDb).riders().find((r) => r.id === 'r1')!.pausado).toBe(true);
    expect(ficha.textContent).toContain('Pausado');
  });

  it('MAIN registra un conflicto desde un pedido y lo resuelve', async () => {
    const el = await abrir('/main');
    // jsdom no implementa showModal: se simula.
    HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) { this.open = true; };
    HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) { this.open = false; this.dispatchEvent(new Event('close')); };
    el.querySelector<HTMLButtonElement>('.reportar')!.click();
    await estable();
    const area = el.querySelector<HTMLTextAreaElement>('textarea')!;
    area.value = 'El cliente dice que faltó un producto';
    area.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('dialog form')!.dispatchEvent(new Event('submit'));
    await estable();
    expect(el.querySelector('#titulo-conflictos')?.textContent).toContain('1 ACTIVOS');
    expect(el.querySelector('.panel .desc')?.textContent).toContain('faltó un producto');

    const select = el.querySelector<HTMLSelectElement>('.actualizar select')!;
    select.value = 'resuelto';
    el.querySelector<HTMLFormElement>('.actualizar')!.dispatchEvent(new Event('submit'));
    await estable();
    expect(el.querySelector('#titulo-conflictos')?.textContent).toContain('0 ACTIVOS');
  });

  it('KIOSCOS permite pausar', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const el = await abrir('/kioscos');
    const fila = [...el.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.includes('Kiosco El Faro'))!;
    fila.querySelector<HTMLButtonElement>('button')!.click();
    await estable();
    expect(TestBed.inject(MockDb).kioscos().find((k) => k.id === 'k1')!.pausado).toBe(true);
  });
});
