import { ComponentFixture, TestBed } from '@angular/core/testing';
import { KIOSCO_ACTUAL_ID, MockDb, OTRO_RIDER_ID, Pedido, provideFreeDeliMocks } from '@freedeli/shared';
import Inicio, { agruparEnVivo } from './inicio';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Inicio en vivo (Kioscos)', () => {
  let fixture: ComponentFixture<Inicio>;
  let el: HTMLElement;
  let db: MockDb;

  async function estable() {
    for (let i = 0; i < 4; i++) {
      await esperar();
      await fixture.whenStable();
    }
  }

  const boton = (texto: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim().startsWith(texto));
  const columna = (id: string) => el.querySelector(`[aria-labelledby=${id}]`)!;

  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [Inicio], providers: [provideFreeDeliMocks({ latencia: 0 })] });
    db = TestBed.inject(MockDb);
    fixture = TestBed.createComponent(Inicio);
    el = fixture.nativeElement;
    await estable();
  });

  function nuevoPedido(): Pedido {
    const p = db.crearPedidoDeCliente(KIOSCO_ACTUAL_ID)!;
    return p;
  }

  it('agrupa por quién tiene que actuar', () => {
    const base = { estado: 'esperando' } as Pedido;
    const g = agruparEnVivo([
      { ...base, id: 'a', fase: 'stock' },
      { ...base, id: 'b', fase: 'ajuste' },
      { ...base, id: 'c', fase: 'aprobacion' },
      { ...base, id: 'd', estado: 'aceptado' },
      { ...base, id: 'e', estado: 'aceptado', retiro: { kiosco: new Date() } },
      { ...base, id: 'f', estado: 'en-camino' },
    ] as Pedido[]);
    expect(g.accion.map((p) => p.id)).toEqual(['a', 'c', 'd']);
    expect(g.esperando.map((p) => p.id)).toEqual(['b', 'e']);
    expect(g.enCamino.map((p) => p.id)).toEqual(['f']);
  });

  it('en un viaje largo le muestra al kiosco cuánto pone del envío', async () => {
    const p = nuevoPedido();
    db.guardarPedido({ ...p, costoEnvio: 2500, gananciaRider: 3400, propina: 0 });
    await estable();
    expect(columna('col-accion').querySelector('.aporte')?.textContent).toContain('vos ponés $900');
  });

  it('un pedido nuevo aparece en TU TURNO y se confirma con un faltante', async () => {
    const p = nuevoPedido();
    await estable();
    expect(columna('col-accion').textContent).toContain(`#A-${p.numero}`);
    const checks = columna('col-accion').querySelectorAll<HTMLInputElement>('.stock input');
    checks[0].click();
    await estable();
    expect(boton('CONFIRMAR SIN 1 PRODUCTO')).toBeDefined();
    if (p.items.length === 1) return;
    boton('CONFIRMAR SIN 1 PRODUCTO')!.click();
    await estable();
    expect(db.buscarPedido(p.id)!.fase).toBe('ajuste');
    expect(columna('col-esperando').textContent).toContain(`#A-${p.numero}`);
  });

  it('transferencia, aprobación del rider y envío', async () => {
    const p = nuevoPedido();
    await estable();
    boton('TENGO TODO')!.click();
    await estable();
    expect(db.buscarPedido(p.id)!.fase).toBe('transferencia');
    boton('TRANSFERENCIA RECIBIDA')!.click();
    await estable();
    expect(db.buscarPedido(p.id)).toMatchObject({ fase: 'rider', pago: 'transferido' });

    db.guardarPedido({ ...db.buscarPedido(p.id)!, riderId: OTRO_RIDER_ID, fase: 'aprobacion' });
    await estable();
    expect(el.textContent).toContain('Agustina Paz');
    boton('APROBAR RIDER')!.click();
    await estable();
    expect(db.buscarPedido(p.id)!.estado).toBe('aceptado');
    boton('CONFIRMAR ENVÍO')!.click();
    await estable();
    expect(db.buscarPedido(p.id)!.retiro?.kiosco).toBeInstanceOf(Date);
    expect(el.textContent).toContain('Falta que el rider confirme el retiro');
  });

  it('un pedido cancelado después de pagar queda en TU TURNO hasta devolver el dinero', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const p = nuevoPedido();
    db.guardarPedido({ ...p, estado: 'cancelado', fase: undefined, pago: 'transferido', cancelacion: { motivo: 'cliente', reintegro: 17000, riderCobra: false } });
    await estable();
    expect(columna('col-accion').textContent).toContain('Devolvele $17.000 al cliente');
    boton('YA LO DEVOLVÍ')!.click();
    await estable();
    expect(el.textContent).not.toContain(`#A-${p.numero}`);
  });
});
