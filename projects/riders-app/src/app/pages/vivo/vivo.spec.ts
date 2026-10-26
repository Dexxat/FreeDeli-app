import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MockDb, RIDER_ACTUAL_ID, provideFreeDeliMocks } from '@freedeli/shared';
import Vivo from './vivo';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Vivo (Riders)', () => {
  let fixture: ComponentFixture<Vivo>;
  let el: HTMLElement;
  let db: MockDb;

  async function estable() {
    for (let i = 0; i < 3; i++) {
      await esperar();
      await fixture.whenStable();
    }
  }

  const boton = (texto: string) =>
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.includes(texto));

  function escribirPin(pin: string) {
    const casillas = el.querySelectorAll<HTMLInputElement>('fd-pin-input input');
    [...pin].forEach((d, i) => {
      casillas[i].value = d;
      casillas[i].dispatchEvent(new Event('input'));
    });
  }

  const enCurso = () => db.pedidos().find((p) => p.riderId === RIDER_ACTUAL_ID && p.estado === 'retirado')!;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Vivo],
      providers: [provideFreeDeliMocks({ latencia: 0 }), provideRouter([])],
    });
    db = TestBed.inject(MockDb);
    fixture = TestBed.createComponent(Vivo);
    el = fixture.nativeElement;
    await estable();
  });

  it('muestra el pedido en curso con su código, kiosco y destino', () => {
    const p = enCurso();
    expect(el.querySelector('h1')?.textContent).toContain(`#A-${p.numero}`);
    expect(el.textContent).toContain(p.kioscoNombre);
    expect(el.textContent).toContain(p.destino.direccion);
    expect(el.querySelector('fd-barra-estado li[aria-current=step]')?.textContent).toContain('Retirado');
  });

  it('pasa a En camino y pide el PIN', async () => {
    boton('SALGO EN CAMINO')!.click();
    await estable();
    expect(el.querySelector('fd-barra-estado li[aria-current=step]')?.textContent).toContain('En camino');
    expect(el.querySelectorAll('fd-pin-input input')).toHaveLength(4);
  });

  it('rechaza un PIN incorrecto y confirma con el correcto', async () => {
    const p = enCurso();
    boton('SALGO EN CAMINO')!.click();
    await estable();

    escribirPin(p.pin === '0000' ? '1111' : '0000');
    boton('CONFIRMAR ENTREGA')!.click();
    await estable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('PIN incorrecto');
    expect(db.pedidos().find((x) => x.id === p.id)!.estado).toBe('en-camino');

    escribirPin(p.pin);
    boton('CONFIRMAR ENTREGA')!.click();
    await estable();
    expect(el.textContent).toContain('¡ENTREGADO!');
    expect(db.pedidos().find((x) => x.id === p.id)!.estado).toBe('entregado');
  });

  it('después de aceptar espera la aprobación del kiosco', async () => {
    const p = enCurso();
    db.guardarPedido({ ...p, estado: 'esperando', fase: 'aprobacion', aceptadoEn: undefined, retiro: undefined });
    await estable();
    expect(el.textContent).toContain('Esperando que el kiosco te confirme');
    expect(boton('YA LO RETIRÉ')).toBeUndefined();
  });

  it('el retiro necesita la confirmación del rider y del kiosco', async () => {
    const p = enCurso();
    db.guardarPedido({ ...p, estado: 'aceptado', retiro: undefined });
    await estable();
    boton('YA LO RETIRÉ')!.click();
    await estable();
    expect(db.buscarPedido(p.id)!.estado).toBe('aceptado');
    expect(el.textContent).toContain('Falta que el kiosco confirme el envío');

    const actual = db.buscarPedido(p.id)!;
    db.guardarPedido({ ...actual, retiro: { ...actual.retiro, kiosco: new Date() }, estado: 'retirado' });
    await estable();
    expect(boton('SALGO EN CAMINO')).toBeDefined();
  });

  it('pide los 4 dígitos antes de enviar', async () => {
    boton('SALGO EN CAMINO')!.click();
    await estable();
    escribirPin('12');
    boton('CONFIRMAR ENTREGA')!.click();
    await estable();
    expect(el.querySelector('[role=alert]')?.textContent).toContain('4 dígitos');
  });
});
