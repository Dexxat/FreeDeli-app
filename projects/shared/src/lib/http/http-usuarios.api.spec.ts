import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject, firstValueFrom, take, toArray } from 'rxjs';
import { Pedido } from '../models/pedido.js';
import { API_URL } from './api-url';
import { EventosCliente } from './eventos';
import { HttpUsuariosApi } from './http-usuarios.api';

const URL = 'http://api.test/api';

function pedidoJson(cambios: Partial<Pedido> = {}): Pedido {
  return {
    id: 'p1', numero: 1001, zona: 'muniz', kioscoId: 'k1', kioscoNombre: 'K', kioscoDireccion: 'D', usuarioId: 'u1',
    destino: { nombre: 'M', direccion: 'Calle 1', ubicacion: { lat: -34.543, lng: -58.701 } }, items: [{ productoId: 'x', nombre: 'Coca', cantidad: 6, precioUnitario: 2800 }],
    costoEnvio: 1200, distanciaKm: 0.5, propina: 0, gananciaRider: 1200, pago: 'pendiente', aliasKiosco: 'a', comisionFreeDeli: 1680,
    pin: '1234', estado: 'esperando', fase: 'stock', creadoEn: '2026-10-26T20:00:00.000Z' as unknown as Date, ...cambios,
  };
}

describe('HttpUsuariosApi', () => {
  let api: HttpUsuariosApi;
  let http: HttpTestingController;
  const eventos = new Subject<Pedido>();

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_URL, useValue: URL },
        { provide: EventosCliente, useValue: { pedidos$: eventos, alConectar: <T>(cargar: () => Observable<T>) => cargar() } },
        HttpUsuariosApi,
      ],
    });
    api = TestBed.inject(HttpUsuariosApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('crear pedido: convierte las fechas', async () => {
    const r = firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [{ productoId: 'x', cantidad: 6 }], ubicacion: { lat: -34.543, lng: -58.701 } }));
    http.expectOne({ method: 'POST', url: `${URL}/pedidos` }).flush(pedidoJson());
    const res = await r;
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.pedido.creadoEn).toBeInstanceOf(Date);
  });

  it('crear pedido: traduce el código de error de la API', async () => {
    const r = firstValueFrom(api.crearPedido({ kioscoId: 'k1', items: [], ubicacion: { lat: -34.543, lng: -58.701 } }));
    http.expectOne(`${URL}/pedidos`).flush({ codigo: 'pedido-minimo', message: 'El pedido mínimo…' }, { status: 409, statusText: 'Conflict' });
    expect(await r).toEqual({ ok: false, motivo: 'pedido-minimo' });
  });

  it('pedido en curso: se actualiza con los eventos y queda en null al cerrarse', async () => {
    const valores = firstValueFrom(api.pedidoEnCurso().pipe(take(3), toArray()));
    http.expectOne(`${URL}/pedidos/en-curso`).flush(pedidoJson());
    eventos.next({ ...pedidoJson({ fase: 'transferencia' }), creadoEn: new Date() });
    eventos.next({ ...pedidoJson({ estado: 'cancelado', fase: undefined }), creadoEn: new Date() });
    const [inicial, actualizado, cerrado] = await valores;
    expect(inicial?.fase).toBe('stock');
    expect(actualizado?.fase).toBe('transferencia');
    expect(cerrado).toBeNull();
  });

  it('recientes: arma la fila con kiosco, total y cantidad', async () => {
    const r = firstValueFrom(api.recientes());
    http.expectOne(`${URL}/pedidos/recientes`).flush([pedidoJson({ estado: 'entregado' })]);
    expect((await r)[0]).toMatchObject({ kiosco: { id: 'k1', nombre: 'K' }, cantidadProductos: 6, total: 6 * 2800 + 1200 });
  });
});
