import { Pedido } from '../models/pedido.js';
import { movimientoDePedido } from './admin.rules.js';

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
  it('si el viaje supera el tope, el kiosco pone la diferencia', () => {
    const m = movimientoDePedido({ ...base, costoEnvio: 2500, gananciaRider: 3400, propina: 0 });
    expect(m.totalCliente).toBe(5600 + 2500);
    expect(m.envioRider).toBe(3400);
    expect(m.aporteEnvio).toBe(900);
    expect(m.netoKiosco).toBe(5600 + 2500 - 3400 - 1500);
  });
  it('el saldo a favor: el cliente paga menos y FreeDeli se lo devuelve al kiosco', () => {
    const m = movimientoDePedido({ ...base, propina: 0, descuentoPremio: 2500 });
    expect(m.totalCliente).toBe(5600 + 1800 - 2500);
    expect(m.descuentoPremio).toBe(2500);
    // El kiosco queda igual que sin premio: cobra 2.500 menos y FreeDeli se los acredita.
    expect(m.netoKiosco).toBe(movimientoDePedido({ ...base, propina: 0 }).netoKiosco);
  });
  it('un cancelado no mueve dinero', () => {
    expect(movimientoDePedido({ ...base, estado: 'cancelado' })).toMatchObject({ totalCliente: 0, envioRider: 0, aporteEnvio: 0, comisionFreeDeli: 0, descuentoPremio: 0, netoKiosco: 0 });
  });
});
