import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { MockDb, USUARIO_ACTUAL_ID, UsuariosApi, provideFreeDeliMocks } from '@freedeli/shared';
import { firstValueFrom } from 'rxjs';
import Realizado from './realizado';

const esperar = () => new Promise((r) => setTimeout(r, 5));

describe('Realizado (Usuarios)', () => {
  it('muestra número, alias para transferir y resumen', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideFreeDeliMocks({ latencia: 0 }),
        provideRouter([{ path: 'pedido/:pedidoId/realizado', component: Realizado }, { path: '**', children: [] }], withComponentInputBinding()),
      ],
    });
    const db = TestBed.inject(MockDb);
    db.pedidos.update((ps) => ps.map((p) => (p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado' ? { ...p, estado: 'entregado' } : p)));
    const r = await firstValueFrom(TestBed.inject(UsuariosApi).crearPedido({ kioscoId: 'k3', items: [{ productoId: 'k3-p4', cantidad: 17 }] }));
    if (!r.ok) throw new Error('no se creó');

    const h = await RouterTestingHarness.create();
    await h.navigateByUrl(`/pedido/${r.pedido.id}/realizado`);
    for (let i = 0; i < 4; i++) {
      await esperar();
      await h.fixture.whenStable();
    }
    const el = h.routeNativeElement!;
    expect(el.textContent).toContain(`PEDIDO #A-${r.pedido.numero}`);
    expect(el.querySelector('.alias-valor')?.textContent).toBe('laestacion.muniz');
    expect(el.textContent).toContain(`Transferí $${(15300 + r.pedido.costoEnvio).toLocaleString('es-AR')}`);
    expect(el.textContent).toContain('Buscando rider');
    expect(el.querySelectorAll('fd-barra-estado li.pendiente')).toHaveLength(4);
    expect(el.querySelector('a[href$="' + r.pedido.id + '"]')?.textContent).toContain('VER SEGUIMIENTO');
  });
});
