import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MockDb, RIDER_ACTUAL_ID, provideFreeDeliMocks } from '@freedeli/shared';
import Historial, { montoRider } from './historial';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Historial (Riders)', () => {
  let fixture: ComponentFixture<Historial>;
  let el: HTMLElement;
  let db: MockDb;

  async function estable() {
    for (let i = 0; i < 3; i++) {
      await esperar();
      await fixture.whenStable();
    }
  }

  const filtro = (t: string) => [...el.querySelectorAll<HTMLButtonElement>('.filtros button')].find((b) => b.textContent?.trim() === t)!;
  const items = () => el.querySelectorAll('.lista li');

  function esperados(desde: Date) {
    return db
      .pedidos()
      .filter((p) => p.riderId === RIDER_ACTUAL_ID && ['entregado', 'cancelado'].includes(p.estado) && p.creadoEn >= desde);
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Historial], providers: [provideFreeDeliMocks({ latencia: 0 })] });
    db = TestBed.inject(MockDb);
    fixture = TestBed.createComponent(Historial);
    el = fixture.nativeElement;
    await estable();
  });

  it('arranca en HOY con los pedidos de hoy y su total', () => {
    const hoy = new Date();
    const lista = esperados(new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()));
    expect(filtro('HOY').getAttribute('aria-pressed')).toBe('true');
    expect(items()).toHaveLength(lista.length);
    const total = lista.reduce((a, p) => a + montoRider(p), 0);
    expect(el.querySelector('.resumen-total')?.textContent?.trim()).toBe(`$${total.toLocaleString('es-AR')}`);
  });

  it('SEMANA trae más pedidos y muestra el día', async () => {
    const deHoy = items().length;
    filtro('SEMANA').click();
    await estable();
    expect(filtro('SEMANA').getAttribute('aria-pressed')).toBe('true');
    expect(items().length).toBeGreaterThan(deHoy);
    expect(el.querySelector('.cuando')?.textContent).toMatch(/\d{2}\/\d{2}/);
  });

  it('un cancelado suma $0', () => {
    const p = db.pedidos().find((x) => x.estado === 'cancelado')!;
    expect(montoRider(p)).toBe(0);
  });
});
