import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MockDb, USUARIO_ACTUAL_ID, provideFreeDeliMocks, totalPedido } from '@freedeli/shared';
import { By } from '@angular/platform-browser';
import Seguimiento from './seguimiento';
import { Rush } from '../../ui/rush/rush';

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
        provideFreeDeliMocks({ latencia: 0, horarioLibre: true }),
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

  describe('FREEDELI RUSH', () => {
    const enCamino = (minutos: number) => (db: MockDb) => {
      const p = db.pedidos().find((x) => x.usuarioId === USUARIO_ACTUAL_ID && x.estado === 'retirado')!;
      db.guardarPedido({ ...p, estado: 'en-camino', enCaminoEn: new Date(Date.now() - minutos * 60_000) });
    };

    it('solo aparece con el rider en camino, con las estrellas del usuario', async () => {
      let el = await abrir('/pedido');
      expect(el.querySelector('fd-rush')).toBeNull();
      TestBed.resetTestingModule();
      el = await abrir('/pedido', enCamino(1));
      expect(el.querySelector('fd-rush')).not.toBeNull();
      expect(el.querySelector('fd-estrellas [role=img]')?.getAttribute('aria-label')).toBe('3 de 5 estrellas');
    });

    it('al jugar 10 minutos seguidos suma la estrella', async () => {
      const el = await abrir('/pedido', enCamino(11));
      h.fixture.debugElement.query(By.directive(Rush)).componentInstance.estrella.emit();
      await estable();
      expect(el.textContent).toContain('¡Sumaste una estrella!');
      expect(el.querySelector('fd-estrellas [role=img]')?.getAttribute('aria-label')).toBe('4 de 5 estrellas');
    });

    it('con la quinta estrella avisa el premio', async () => {
      const el = await abrir('/pedido', (db) => {
        enCamino(12)(db);
        db.usuarios.update((us) => us.map((u) => ({ ...u, estrellas: 4 })));
      });
      h.fixture.debugElement.query(By.directive(Rush)).componentInstance.estrella.emit();
      await estable();
      expect(el.textContent).toContain('¡GANASTE $2.500!');
    });

    it('si el servidor no la acepta, explica por qué', async () => {
      const el = await abrir('/pedido', enCamino(3));
      h.fixture.debugElement.query(By.directive(Rush)).componentInstance.estrella.emit();
      await estable();
      expect(el.querySelector('.premios [role=alert]')?.textContent).toContain('10 minutos');
    });
  });

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

  it('en un ajuste de stock el cliente acepta o cancela', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const el = await abrir('/pedido', (db) =>
      db.pedidos.update((ps) =>
        ps.map((p) =>
          p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado'
            ? { ...p, estado: 'esperando', fase: 'ajuste', riderId: undefined, aceptadoEn: undefined, itemsQuitados: [{ productoId: 'x', nombre: 'Hielo 2 kg', cantidad: 1, precioUnitario: 1500 }] }
            : p,
        ),
      ),
    );
    expect(el.textContent).toContain('FALTAN PRODUCTOS');
    expect(el.textContent).toContain('Hielo 2 kg');
    [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === 'Cancelar pedido')!.click();
    await estable();
    expect(el.textContent).toContain('CANCELADO');
  });

  it('sin pedido en curso invita a pedir', async () => {
    const el = await abrir('/pedido', (db) =>
      db.pedidos.update((ps) => ps.map((p) => (p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado' ? { ...p, estado: 'entregado' } : p))),
    );
    expect(el.textContent).toContain('No tenés ningún pedido en curso');
    expect(el.querySelector('a[href="/pedir"]')).not.toBeNull();
  });

  it('esperando la transferencia: sin estimado ni rider, muestra el alias', async () => {
    const el = await abrir('/pedido', (db) =>
      db.pedidos.update((ps) =>
        ps.map((p) => (p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado' ? { ...p, estado: 'esperando', fase: 'transferencia', riderId: undefined, aceptadoEn: undefined, pago: 'pendiente' } : p)),
      ),
    );
    expect(el.querySelector('.eta')).toBeNull();
    expect(el.textContent).toContain('Todavía ningún rider aceptó');
    expect(el.textContent).toContain('PAGO POR TRANSFERENCIA');
  });

  describe('cancelaciones', () => {
    const boton = (el: HTMLElement, texto: string) => [...el.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === texto)!;

    it('con el pedido pagado avisa cuánto devuelve el kiosco y lo muestra al cancelar', async () => {
      const confirmar = vi.spyOn(window, 'confirm').mockReturnValue(true);
      const el = await abrir('/pedido');
      const total = totalPedido(enCurso()).toLocaleString('es-AR');
      boton(el, 'Cancelar pedido').click();
      await estable();
      expect(confirmar.mock.calls[0][0]).toContain(`te devuelve $${total}`);
      expect(confirmar.mock.calls[0][0]).toContain('3 pedidos en una semana');
      expect(el.textContent).toContain('CANCELADO');
      expect(el.textContent).toContain(`El kiosco te devuelve $${total} a la cuenta desde la que transferiste.`);
    });

    it('a los 10 minutos sin rider pregunta si sigue esperando', async () => {
      const el = await abrir('/pedido', (db) =>
        db.pedidos.update((ps) =>
          ps.map((p) =>
            p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado'
              ? { ...p, estado: 'esperando', fase: 'rider', riderId: undefined, aceptadoEn: undefined, retiro: undefined, buscandoRiderDesde: new Date(Date.now() - 11 * 60_000) }
              : p,
          ),
        ),
      );
      expect(el.textContent).toContain('TODAVÍA NO HAY RIDER');
      boton(el, 'SEGUIR ESPERANDO').click();
      await estable();
      expect(el.textContent).toContain('BUSCANDO RIDER');
    });
  });
});
