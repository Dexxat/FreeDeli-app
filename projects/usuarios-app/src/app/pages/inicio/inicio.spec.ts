import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockDb, USUARIO_ACTUAL_ID, provideFreeDeliMocks } from '@freedeli/shared';
import Inicio from './inicio';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Inicio (Usuarios)', () => {
  let fixture: ComponentFixture<Inicio>;
  let el: HTMLElement;
  let db: MockDb;

  async function estable() {
    for (let i = 0; i < 3; i++) {
      await esperar();
      await fixture.whenStable();
    }
  }

  function crear() {
    fixture = TestBed.createComponent(Inicio);
    el = fixture.nativeElement;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [Inicio],
      providers: [provideFreeDeliMocks({ latencia: 0, horarioLibre: true }), provideRouter([])],
    });
    db = TestBed.inject(MockDb);
  });

  it('saluda y muestra la dirección de entrega', async () => {
    crear();
    await estable();
    expect(el.querySelector('h1')?.textContent).toContain('Hola, Martina');
    expect(el.textContent).toContain('Belgrano 845');
  });

  it('con un pedido en curso, PEDIR lleva al seguimiento', async () => {
    crear();
    await estable();
    const pedir = el.querySelector<HTMLAnchorElement>('a.pedir')!;
    expect(pedir.textContent).toContain('Tenés un pedido en curso');
    expect(pedir.getAttribute('href')).toMatch(/^\/pedido\/ped-\d+$/);
    expect(el.querySelector('fd-barra-estado')).not.toBeNull();
  });

  it('sin pedido en curso, PEDIR muestra los kioscos abiertos', async () => {
    db.pedidos.update((ps) => ps.map((p) => (p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado' ? { ...p, estado: 'entregado' } : p)));
    crear();
    await estable();
    const pedir = el.querySelector<HTMLAnchorElement>('a.pedir')!;
    expect(pedir.textContent).toContain('4 kioscos abiertos ahora');
    expect(pedir.getAttribute('href')).toBe('/pedir');
    expect(el.querySelector('fd-barra-estado')).toBeNull();
  });

  it('lista kioscos para pedir de nuevo', async () => {
    crear();
    await estable();
    const recientes = el.querySelectorAll<HTMLAnchorElement>('a.reciente');
    expect(recientes.length).toBeGreaterThan(0);
    expect(recientes[0].getAttribute('href')).toMatch(/^\/pedir\/k\d\?repetir=ped-\d+$/);
  });

  it('cambia la dirección y valida la altura', async () => {
    crear();
    await estable();
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Cambiar')!.click();
    await estable();
    const input = el.querySelector<HTMLInputElement>('input[name=direccion]')!;
    input.value = 'Sin numero';
    input.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await estable();
    expect(el.textContent).toContain('Ingresá la calle y la altura');

    input.value = 'Paunero 1500';
    input.dispatchEvent(new Event('input'));
    el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    await estable();
    expect(db.usuarios()[0].direccion.direccion).toBe('Paunero 1500');
    expect(el.querySelector('form')).toBeNull();
  });
});
