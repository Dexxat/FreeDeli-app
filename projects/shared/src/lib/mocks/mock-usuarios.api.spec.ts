import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { UsuariosApi } from '../api/usuarios.api';
import { subtotalProductos, totalPedido } from '../models/pedido';
import { MockDb, USUARIO_ACTUAL_ID } from './mock-db';
import { SimulacionRider } from './mock-usuarios.api';
import { provideFreeDeliMocks } from './provide-mocks';

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('MockUsuariosApi', () => {
  let api: UsuariosApi;
  let db: MockDb;

  function configurar(simulacionRider: SimulacionRider | null = null) {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0, simulacionRider })] });
    api = TestBed.inject(UsuariosApi);
    db = TestBed.inject(MockDb);
  }

  /** Cierra el pedido en curso del seed para poder crear uno nuevo. */
  function sinPedidoAbierto() {
    db.pedidos.update((ps) => ps.map((p) => (p.usuarioId === USUARIO_ACTUAL_ID && p.estado === 'retirado' ? { ...p, estado: 'entregado' } : p)));
  }

  it('lista solo kioscos abiertos y filtra por zona', async () => {
    configurar();
    const todos = await firstValueFrom(api.kioscosAbiertos());
    expect(todos.every((k) => k.abierto && !k.pausado)).toBe(true);
    expect(todos.map((k) => k.id)).not.toContain('k5');
    const muniz = await firstValueFrom(api.kioscosAbiertos('muniz'));
    expect(muniz.map((k) => k.id)).toEqual(['k3']);
  });

  it('el usuario tiene un pedido en curso en el seed', async () => {
    configurar();
    expect(await firstValueFrom(api.pedidoEnCurso())).toMatchObject({ estado: 'retirado', usuarioId: USUARIO_ACTUAL_ID });
  });

  it('no deja crear otro pedido con uno en curso', async () => {
    configurar();
    const r = await firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'k1-p1', cantidad: 6 }] }));
    expect(r).toEqual({ ok: false, motivo: 'pedido-en-curso' });
  });

  it('crea el pedido con precios del catálogo, PIN y la dirección del usuario', async () => {
    configurar();
    sinPedidoAbierto();
    const r = await firstValueFrom(
      api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'k1-p1', cantidad: 6 }, { productoId: 'k1-p2', cantidad: 0 }] }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.pedido.estado).toBe('esperando');
    expect(r.pedido.items).toEqual([{ productoId: 'k1-p1', nombre: 'Coca-Cola 1,5 L', cantidad: 6, precioUnitario: 2800 }]);
    // El Faro queda a unos 500 m de Belgrano 845: $1.000 + 0,5 km × $400 = $1.200.
    expect(r.pedido.distanciaKm).toBe(0.5);
    expect(totalPedido(r.pedido)).toBe(6 * 2800 + 1200);
    expect(r.pedido.pin).toMatch(/^\d{4}$/);
    expect(r.pedido.destino.direccion).toBe('Belgrano 845');
    expect(r.pedido).toMatchObject({ pago: 'pendiente', aliasKiosco: 'elfaro.kiosco', comisionFreeDeli: 1680, gananciaRider: 1200, costoEnvio: 1200 });
  });

  it('rechaza kiosco cerrado, carrito vacío y productos de otro kiosco', async () => {
    configurar();
    sinPedidoAbierto();
    expect(await firstValueFrom(api.crearPedido({ kioscoId: 'k5', items: [{ productoId: 'k5-p1', cantidad: 1 }] }))).toEqual({ ok: false, motivo: 'kiosco-cerrado' });
    expect(await firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [] }))).toEqual({ ok: false, motivo: 'sin-productos' });
    expect(await firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'k2-p1', cantidad: 6 }] }))).toEqual({ ok: false, motivo: 'producto-inexistente' });
  });

  it('el envío depende de la distancia a la dirección del usuario', async () => {
    configurar();
    const cerca = await firstValueFrom(api.kiosco('k1'));
    const lejos = await firstValueFrom(api.kiosco('k4'));
    expect(cerca!.distanciaKm).toBeLessThan(lejos!.distanciaKm!);
    expect(cerca!.costoEnvio).toBeLessThan(lejos!.costoEnvio);
  });

  it('exige el pedido mínimo de $15.000 en productos', async () => {
    configurar();
    sinPedidoAbierto();
    const r = await firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'k1-p1', cantidad: 5 }] }));
    expect(r).toEqual({ ok: false, motivo: 'pedido-minimo' });
  });

  it('un kiosco sin saldo prepago no aparece ni recibe pedidos', async () => {
    configurar();
    sinPedidoAbierto();
    db.kioscos.update((ks) => ks.map((k) => (k.id === 'k1' ? { ...k, saldo: 1000 } : k)));
    expect((await firstValueFrom(api.kioscosAbiertos())).map((k) => k.id)).not.toContain('k1');
    const r = await firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'k1-p1', cantidad: 6 }] }));
    expect(r).toEqual({ ok: false, motivo: 'kiosco-cerrado' });
  });

  it('recientes: un kiosco por fila, del más nuevo al más viejo', async () => {
    configurar();
    const r = await firstValueFrom(api.recientes(3));
    expect(r.length).toBeGreaterThan(0);
    expect(new Set(r.map((x) => x.kiosco.id)).size).toBe(r.length);
    for (let i = 1; i < r.length; i++) expect(r[i - 1].fecha.getTime()).toBeGreaterThanOrEqual(r[i].fecha.getTime());
  });

  it('el rider simulado lleva el pedido hasta Entregado', async () => {
    configurar({ aceptar: 10, retirar: 10, salir: 10, entregar: 10 });
    sinPedidoAbierto();
    const saldoAntes = db.kioscos().find((k) => k.id === 'k3')!.saldo;
    const r = await firstValueFrom(api.crearPedido({ kioscoId: 'k3', items: [{ productoId: 'k3-p4', cantidad: 17 }] }));
    if (!r.ok) throw new Error('no se creó');
    const vistos: string[] = [];
    for (let i = 0; i < 20 && vistos.at(-1) !== 'entregado'; i++) {
      TestBed.tick();
      await esperar(15);
      const estado = db.pedidos().find((p) => p.id === r.pedido.id)!.estado;
      if (vistos.at(-1) !== estado) vistos.push(estado);
    }
    expect(vistos.at(-1)).toBe('entregado');
    expect(db.kioscos().find((k) => k.id === 'k3')!.saldo).toBe(saldoAntes - r.pedido.comisionFreeDeli);
    const rider = await firstValueFrom(api.riderAsignado(r.pedido.id));
    expect(rider).toEqual({ nombre: 'Agustina P.', vehiculo: 'Motomel Blitz 110', patente: 'A456KLM' });
  });
});

describe('Datos simulados', () => {
  it('todos los pedidos simulados cumplen el pedido mínimo', () => {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0, simulacionRider: null })] });
    for (const p of TestBed.inject(MockDb).pedidos()) expect(subtotalProductos(p)).toBeGreaterThanOrEqual(15_000);
  });

  it('los productos de los pedidos existen en el catálogo de su kiosco', () => {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0, simulacionRider: null })] });
    const db = TestBed.inject(MockDb);
    const ids = new Set(db.productos().map((p) => p.id));
    for (const p of db.pedidos()) {
      for (const i of p.items) expect(ids.has(i.productoId) && i.productoId.startsWith(p.kioscoId + '-')).toBe(true);
    }
  });
});
