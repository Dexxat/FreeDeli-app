import { Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KIOSCO_ACTUAL_ID, MockDb, provideFreeDeliMocks } from '@freedeli/shared';
import Ajustes from './ajustes';
import Pedidos from '../pedidos/pedidos';
import Ganancias from '../ganancias/ganancias';

const esperar = () => new Promise((r) => setTimeout(r, 5));

async function montar<T>(c: Type<T>) {
  TestBed.configureTestingModule({ imports: [c], providers: [provideFreeDeliMocks({ latencia: 0 })] });
  const fixture: ComponentFixture<T> = TestBed.createComponent(c);
  const estable = async () => {
    for (let i = 0; i < 4; i++) {
      await esperar();
      await fixture.whenStable();
    }
  };
  await estable();
  return { el: fixture.nativeElement as HTMLElement, estable, db: TestBed.inject(MockDb) };
}

describe('Kioscos: Ganancias, Pedidos y Ajustes', () => {
  it('Ganancias muestra el desglose hasta el neto', async () => {
    const { el } = await montar(Ganancias);
    expect(el.textContent).toContain('Cobrado a clientes');
    expect(el.textContent).toContain('Comisiones FreeDeli');
  });

  it('Pedidos lista los terminados del período', async () => {
    const { el, estable } = await montar(Pedidos);
    [...el.querySelectorAll<HTMLButtonElement>('.periodos button')].find((b) => b.textContent?.trim() === 'MES')!.click();
    await estable();
    expect(el.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });

  it('Ajustes marca un producto sin stock y cambia un precio', async () => {
    const { el, estable, db } = await montar(Ajustes);
    const fila = [...el.querySelectorAll('tbody tr')].find((tr) => tr.textContent?.includes('Alfajor triple'))!;
    fila.querySelector<HTMLInputElement>('.stock input')!.click();
    await estable();
    expect(db.productos().find((p) => p.id === `${KIOSCO_ACTUAL_ID}-p2`)!.disponible).toBe(false);
    const precio = fila.querySelector<HTMLInputElement>('.precio input')!;
    precio.value = '1350';
    precio.dispatchEvent(new Event('change'));
    await estable();
    expect(db.productos().find((p) => p.id === `${KIOSCO_ACTUAL_ID}-p2`)!.precio).toBe(1350);
    expect(el.querySelector('.alias-valor')?.textContent).toBe('freedeli.pagos');
  });
});
