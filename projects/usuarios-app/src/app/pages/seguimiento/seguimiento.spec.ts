import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MockDb, USUARIO_ACTUAL_ID, provideFreeDeliMocks } from '@freedeli/shared';
import Seguimiento from './seguimiento';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Seguimiento (Usuarios)', () => {
  let db: MockDb;
  let h: RouterTestingHarness;

  async function estable() {
    for (let i = 0; i < 5; i++) {
      await esperar();
      await h.fixture.whenStable();
    }
  }

  async function abrir(url: string, preparar?: (db: MockDb) => void) {
    TestBed.configureTestingModule({
      providers: [
        provideFreeDeliMocks({ latencia: 0, simulacionRider: null }),
        provideRouter(
          [{ path: 'pedido', component: Seguimiento }, { path: 'pedido/:pedidoId', component: Seguimiento }, { path: '**', children: [] }],
          withComponentInputBinding(),
        ),
      ],
    });
    db = TestBed.inject(MockDb);
    preparar?.(db);
    h = await RouterTestingHarness.create();
    await h.navigateByUrl(url);
    await estable();
    return h.routeNativeElement!;
  }

  const enCurso = () => db.pedidos().find((p) => p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado')!;

  it('MI PEDIDO muestra el pedido en curso con PIN, rider y tiempo estimado', async () => {
    const el = await abrir('/pedido');
    const p = enCurso();
    expect(el.querySelector('h1')?.textContent).toContain(`#A-${p.numero}`);
    expect(el.querySelector('[role=img]')?.getAttribute('aria-label')).toBe(`PIN ${[...p.pin].join(' ')}`);
    expect(el.querySelector('.rider-nombre')?.textContent).toBe('Lucas R.');
    expect(el.querySelector('.eta')?.textContent).toMatch(/^~\d+ min$/);
    expect(el.querySelector('a.whatsapp')?.getAttribute('href')).toContain(encodeURIComponent(`#A-${p.numero}`));
  });

  it('pasa a ENTREGADO cuando el rider ingresa el PIN', async () => {
    const el = await abrir('/pedido');
    const p = enCurso();
    db.pedidos.update((ps) => ps.map((x) => (x.id === p.id ? { ...x, estado: 'entregado', entregadoEn: new Date(), pago: 'liberado' } : x)));
    await h.navigateByUrl(`/pedido/${p.id}`);
    await estable();
    const vista = h.routeNativeElement!;
    expect(vista.querySelector('h1')?.textContent).toBe('¡ENTREGADO!');
    expect(vista.querySelectorAll('fd-barra-estado li.completado')).toHaveLength(4);
    expect(vista.textContent).toContain('Total pagado');
    expect(el).toBeTruthy();
  });

  it('MI PEDIDO muestra la entrega confirmada aunque el pedido ya no esté en curso', async () => {
    const el = await abrir('/pedido');
    const p = enCurso();
    db.pedidos.update((ps) => ps.map((x) => (x.id === p.id ? { ...x, estado: 'entregado', entregadoEn: new Date(), pago: 'liberado' } : x)));
    await estable();
    expect(el.querySelector('h1')?.textContent).toBe('¡ENTREGADO!');
  });

  it('sin pedido en curso invita a pedir', async () => {
    const el = await abrir('/pedido', (db) =>
      db.pedidos.update((ps) => ps.map((p) => (p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado' ? { ...p, estado: 'entregado' } : p))),
    );
    expect(el.textContent).toContain('No tenés ningún pedido en curso');
    expect(el.querySelector('a[href="/pedir"]')).not.toBeNull();
  });

  it('esperando rider: sin estimado y avisa el pago pendiente', async () => {
    const el = await abrir('/pedido', (db) =>
      db.pedidos.update((ps) =>
        ps.map((p) => (p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado' ? { ...p, estado: 'esperando', riderId: undefined, aceptadoEn: undefined, pago: 'pendiente' } : p)),
      ),
    );
    expect(el.textContent).toContain('Buscando rider');
    expect(el.textContent).toContain('Todavía ningún rider aceptó');
    expect(el.textContent).toContain('Falta confirmar tu transferencia');
  });
});
