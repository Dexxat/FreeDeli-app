import { TestBed } from '@angular/core/testing';
import { Router, provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MockDb, USUARIO_ACTUAL_ID, provideFreeDeliMocks } from '@freedeli/shared';
import Kiosco from './kiosco';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Kiosco (Usuarios)', () => {
  let db: MockDb;
  let h: RouterTestingHarness;

  async function estable() {
    for (let i = 0; i < 4; i++) {
      await esperar();
      await h.fixture.whenStable();
    }
  }

  async function abrir(url: string, conPedidoEnCurso = false) {
    TestBed.configureTestingModule({
      providers: [
        provideFreeDeliMocks({ latencia: 0, simulacionRider: null }),
        provideRouter([{ path: 'pedir/:kioscoId', component: Kiosco }, { path: '**', children: [] }], withComponentInputBinding()),
      ],
    });
    db = TestBed.inject(MockDb);
    if (!conPedidoEnCurso) {
      db.pedidos.update((ps) => ps.map((p) => (p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado' ? { ...p, estado: 'entregado' } : p)));
    }
    h = await RouterTestingHarness.create();
    await h.navigateByUrl(url);
    await estable();
    return h.routeNativeElement!;
  }

  const boton = (el: HTMLElement, t: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === t)!;
  const agregar = (el: HTMLElement, nombre: string) => el.querySelector<HTMLButtonElement>(`[aria-label="Agregar ${nombre}"]`)!.click();

  it('suma productos más envío y crea el pedido', async () => {
    const el = await abrir('/pedir/k1');
    expect(el.querySelector('h1')?.textContent).toContain('Kiosco El Faro');
    expect(boton(el, 'HACER PEDIDO').disabled).toBe(true);

    agregar(el, 'Coca-Cola 1,5 L');
    agregar(el, 'Coca-Cola 1,5 L');
    agregar(el, 'Alfajor triple');
    await estable();
    expect(el.querySelector('.resumen')?.textContent).toContain('3 productos + envío $1.500');
    expect(el.querySelector('.total')?.textContent?.trim()).toBe('$8.300');

    const navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    boton(el, 'HACER PEDIDO').click();
    await estable();
    const creado = db.pedidos().at(-1)!;
    expect(creado).toMatchObject({ kioscoId: 'k1', estado: 'esperando', usuarioId: USUARIO_ACTUAL_ID });
    expect(navegar).toHaveBeenCalledWith(['/pedido', creado.id, 'realizado']);
  });

  it('el botón − no baja de cero', async () => {
    const el = await abrir('/pedir/k1');
    const menos = el.querySelector<HTMLButtonElement>('[aria-label="Quitar Alfajor triple"]')!;
    expect(menos.disabled).toBe(true);
  });

  it('"Pedí de nuevo" carga los productos del pedido anterior', async () => {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0, simulacionRider: null })] });
    const anterior = TestBed.inject(MockDb).pedidos().find((p) => p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'entregado')!;
    TestBed.resetTestingModule();
    const el = await abrir(`/pedir/${anterior.kioscoId}?repetir=${anterior.id}`);
    const esperado = anterior.items.reduce((a, i) => a + i.cantidad, 0);
    expect(el.querySelector('.resumen')?.textContent).toContain(`${esperado} producto`);
  });

  it('al cambiar de kiosco vacía el carrito', async () => {
    const el = await abrir('/pedir/k1');
    agregar(el, 'Alfajor triple');
    await estable();
    await h.navigateByUrl('/pedir/k2');
    await estable();
    expect(h.routeNativeElement!.querySelector('.resumen')?.textContent).toContain('0 productos');
  });

  it('con un pedido en curso no deja hacer otro', async () => {
    const el = await abrir('/pedir/k1', true);
    expect(el.textContent).toContain('VER MI PEDIDO EN CURSO');
    expect(boton(el, 'HACER PEDIDO')).toBeUndefined();
  });
});
