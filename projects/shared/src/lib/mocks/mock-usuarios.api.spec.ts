import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { UsuariosApi } from '../api/usuarios.api';
import { subtotalProductos, totalPedido } from '../models/pedido';
import { MockDb, USUARIO_ACTUAL_ID } from './mock-db';
import { provideFreeDeliMocks } from './provide-mocks';
import { anilloEnvio } from '../rules/pedido.rules';
import { FREEDELI_CONFIG, TARIFA_ENVIO_PROVISORIA } from '../config/freedeli.config';

const FREEDELI_CONFIG_BASE = { whatsapp: '5491100000000', comisionPorcentaje: 10, tarifaEnvio: TARIFA_ENVIO_PROVISORIA, aliasFreeDeli: 'freedeli.pagos' };

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

describe('MockUsuariosApi', () => {
  let api: UsuariosApi;
  let db: MockDb;

  function configurar(simular?: { cliente?: boolean; kiosco?: boolean; rider?: boolean }, extra: { horarioLibre?: boolean; tarifa?: { cerca: number; media: number; lejos: number } } = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideFreeDeliMocks({ latencia: 0, simular, demoras: { paso: 40 }, horarioLibre: extra.horarioLibre ?? true }),
        ...(extra.tarifa ? [{ provide: FREEDELI_CONFIG, useValue: { ...FREEDELI_CONFIG_BASE, tarifaEnvio: extra.tarifa } }] : []),
      ],
    });
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
    expect(todos.every((k) => k.recibePedidos)).toBe(true);
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

  describe('horario nocturno', () => {
    afterEach(() => vi.useRealTimers());

    it('fuera de 00 a 08 hs no deja pedir', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-27T17:00:00Z')); // 14 hs en Argentina
      configurar(undefined, { horarioLibre: false });
      sinPedidoAbierto();
      const r = await firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'k1-p1', cantidad: 6 }] }));
      expect(r).toEqual({ ok: false, motivo: 'fuera-de-horario' });
    });

    it('de madrugada deja pedir', async () => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date('2026-10-27T05:30:00Z')); // 02:30 en Argentina
      configurar(undefined, { horarioLibre: false });
      sinPedidoAbierto();
      const r = await firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'k1-p1', cantidad: 6 }] }));
      expect(r.ok).toBe(true);
    });
  });

  it('el cliente paga el envío hasta el tope y el rider cobra el viaje completo', async () => {
    configurar();
    sinPedidoAbierto();
    const k = (await firstValueFrom(api.kioscosAbiertos())).find((x) => x.id === 'k1')!;
    expect(k.costoEnvio).toBe(2500);
    const r = await firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'k1-p1', cantidad: 6 }] }));
    if (!r.ok) throw new Error('no se creó');
    // Anillo de menos de 1,5 km: el rider cobra $3.000, el cliente paga $2.500 y el kiosco pone $500.
    expect(r.pedido).toMatchObject({ costoEnvio: 2500, gananciaRider: 3000 });
    expect(totalPedido(r.pedido)).toBe(6 * 2800 + 2500);
  });

  it('si el viaje cuesta menos que el tope, el cliente paga el costo real', async () => {
    configurar(undefined, { tarifa: { cerca: 1800, media: 2200, lejos: 2600 } });
    sinPedidoAbierto();
    const r = await firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'k1-p1', cantidad: 6 }] }));
    if (!r.ok) throw new Error('no se creó');
    expect(r.pedido).toMatchObject({ costoEnvio: 1800, gananciaRider: 1800 });
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
    // El Faro queda a unos 200 m de Belgrano 845: anillo cercano, $3.000 al rider y $2.500 el cliente.
    expect(r.pedido.distanciaKm).toBe(0.2);
    expect(totalPedido(r.pedido)).toBe(6 * 2800 + 2500);
    expect(r.pedido.pin).toMatch(/^\d{4}$/);
    expect(r.pedido.destino.direccion).toBe('Belgrano 845');
    expect(r.pedido).toMatchObject({ pago: 'pendiente', aliasKiosco: 'elfaro.kiosco', comisionFreeDeli: 1680, gananciaRider: 3000, costoEnvio: 2500 });
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
    expect(anilloEnvio(cerca!.distanciaKm!)).toBe('cerca');
    expect(anilloEnvio(lejos!.distanciaKm!)).toBe('media');
    // Los dos superan el tope: el cliente paga lo mismo.
    expect(cerca!.costoEnvio).toBe(2500);
    expect(lejos!.costoEnvio).toBe(2500);
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

  it('con kiosco y rider simulados, el pedido llega hasta Entregado', async () => {
    configurar({ kiosco: true, rider: true });
    sinPedidoAbierto();
    const saldoAntes = db.kioscos().find((k) => k.id === 'k3')!.saldo;
    const r = await firstValueFrom(api.crearPedido({ kioscoId: 'k3', items: [{ productoId: 'k3-p4', cantidad: 17 }] }));
    if (!r.ok) throw new Error('no se creó');
    expect(r.pedido).toMatchObject({ estado: 'esperando', fase: 'stock' });
    const vistos: string[] = [];
    for (let i = 0; i < 200 && vistos.at(-1) !== 'entregado'; i++) {
      TestBed.tick();
      await esperar(8);
      const p = db.pedidos().find((x) => x.id === r.pedido.id)!;
      const paso = p.fase ?? p.estado;
      if (vistos.at(-1) !== paso) vistos.push(paso);
    }
    expect(vistos).toEqual(expect.arrayContaining(['transferencia', 'rider', 'aprobacion', 'aceptado', 'retirado', 'en-camino', 'entregado']));
    expect(db.kioscos().find((k) => k.id === 'k3')!.saldo).toBe(saldoAntes - r.pedido.comisionFreeDeli);
    const rider = await firstValueFrom(api.riderAsignado(r.pedido.id));
    expect(rider).toEqual({ nombre: 'Agustina P.', vehiculo: 'Motomel Blitz 110', patente: 'A456KLM' });
  });

  it('el cliente acepta un ajuste de stock o cancela', async () => {
    configurar();
    sinPedidoAbierto();
    const r = await firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'k1-p1', cantidad: 6 }, { productoId: 'k1-p7', cantidad: 2 }] }));
    if (!r.ok) throw new Error('no se creó');
    db.guardarPedido({ ...r.pedido, fase: 'ajuste' });
    expect((await firstValueFrom(api.aceptarAjuste(r.pedido.id))).fase).toBe('transferencia');
    expect((await firstValueFrom(api.cancelarPedido(r.pedido.id))).estado).toBe('cancelado');
  });
});

describe('Datos simulados', () => {
  it('todos los pedidos simulados cumplen el pedido mínimo', () => {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0 })] });
    for (const p of TestBed.inject(MockDb).pedidos()) expect(subtotalProductos(p)).toBeGreaterThanOrEqual(15_000);
  });

  it('los productos de los pedidos existen en el catálogo de su kiosco', () => {
    TestBed.configureTestingModule({ providers: [provideFreeDeliMocks({ latencia: 0 })] });
    const db = TestBed.inject(MockDb);
    const ids = new Set(db.productos().map((p) => p.id));
    for (const p of db.pedidos()) {
      for (const i of p.items) expect(ids.has(i.productoId) && i.productoId.startsWith(p.kioscoId + '-')).toBe(true);
    }
  });
});
