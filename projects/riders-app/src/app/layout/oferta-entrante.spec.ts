import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { MockDb, RIDER_ACTUAL_ID, armarOferta, provideFreeDeliMocks } from '@freedeli/shared';
import { OfertaEntrante } from './oferta-entrante';

const esperar = (ms = 5) => new Promise((r) => setTimeout(r, ms));

describe('OfertaEntrante (Riders)', () => {
  let fixture: ComponentFixture<OfertaEntrante>;
  let el: HTMLElement;
  let db: MockDb;

  async function estable() {
    for (let i = 0; i < 3; i++) {
      await esperar();
      await fixture.whenStable();
    }
  }

  const boton = (t: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === t)!;

  /** Ofrece a mano un pedido nuevo, sin esperar al despachador simulado. */
  function ofrecer(segundos = 30) {
    const p = db.crearPedidoEsperando(['san-miguel'])!;
    db.ofertas.update((o) => ({ ...o, [RIDER_ACTUAL_ID]: armarOferta(p, new Date(), segundos) }));
    return p;
  }

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [OfertaEntrante],
      providers: [provideFreeDeliMocks({ latencia: 0, demoraOferta: 60_000 }), provideRouter([])],
    });
    db = TestBed.inject(MockDb);
    fixture = TestBed.createComponent(OfertaEntrante);
    el = fixture.nativeElement;
    await estable();
  });

  it('no muestra nada sin oferta', () => {
    expect(el.querySelector('[role=alertdialog]')).toBeNull();
  });

  it('muestra la oferta con la entrega aproximada y la cuenta regresiva', async () => {
    const p = ofrecer();
    await estable();
    expect(el.querySelector('[role=alertdialog]')).not.toBeNull();
    expect(el.textContent).toContain(p.kioscoNombre);
    expect(el.textContent).not.toContain(p.destino.direccion);
    expect(el.querySelector('[role=timer]')?.textContent?.trim()).toMatch(/^(30|29)s$/);
  });

  it('aceptar asigna el pedido y lleva a Vivo', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const p = ofrecer();
    await estable();
    boton('ACEPTAR').click();
    await estable();
    expect(db.pedidos().find((x) => x.id === p.id)).toMatchObject({ estado: 'esperando', fase: 'aprobacion', riderId: RIDER_ACTUAL_ID });
    expect(navegar).toHaveBeenCalledWith('/vivo');
    expect(el.querySelector('[role=alertdialog]')).toBeNull();
    expect(el.querySelector('[role=status]')).toBeNull();
  });

  it('rechazar cierra el aviso y el rider sigue en línea', async () => {
    const p = ofrecer();
    await estable();
    boton('Rechazar').click();
    await estable();
    expect(db.pedidos().find((x) => x.id === p.id)!.riderId).toBe('r2');
    expect(el.querySelector('[role=status]')?.textContent).toContain('Seguís en línea');
  });

  it('si vence, avisa que pasó a otro rider', async () => {
    ofrecer(0.05);
    await estable();
    await esperar(120);
    await estable();
    expect(el.querySelector('[role=alertdialog]')).toBeNull();
    expect(el.querySelector('[role=status]')?.textContent).toContain('Se terminó el tiempo');
  });
});
