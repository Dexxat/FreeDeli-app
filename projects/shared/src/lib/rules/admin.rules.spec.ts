import { Pedido } from '../models/pedido';
import { movimientoDePedido } from './admin.rules';

const base: Pedido = {
  id: 'x', numero: 1, zona: 'muniz', kioscoId: 'k3', kioscoNombre: 'K', kioscoDireccion: '', usuarioId: 'u1',
  destino: { nombre: '', direccion: '' },
  items: [{ productoId: 'k3-p1', nombre: 'Coca', cantidad: 2, precioUnitario: 2800 }],
  costoEnvio: 1800, distanciaKm: 2, propina: 500, gananciaRider: 1800, pago: 'liberado', aliasKiosco: 'a', comisionFreeDeli: 1500,
  pin: '0000', estado: 'entregado', creadoEn: new Date(),
};

describe('movimientoDePedido', () => {
  it('reparte el pago del cliente entre rider, FreeDeli y kiosco', () => {
    const m = movimientoDePedido(base);
    expect(m.totalCliente).toBe(5600 + 1800);
    expect(m.envioRider).toBe(2300);
    expect(m.comisionFreeDeli).toBe(1500);
    expect(m.netoKiosco).toBe(7400 - 2300 - 1500);
  });
  it('un cancelado no mueve dinero', () => {
    expect(movimientoDePedido({ ...base, estado: 'cancelado' })).toMatchObject({ totalCliente: 0, envioRider: 0, comisionFreeDeli: 0, netoKiosco: 0 });
  });
});
