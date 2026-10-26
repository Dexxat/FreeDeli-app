import { Pedido } from '../models/pedido';
import {
  aceptarAjuste,
  aprobarRider,
  asignarRider,
  cancelarPorCliente,
  confirmarRetiro,
  confirmarStock,
  confirmarTransferencia,
  entregarConPin,
  quienDebeActuar,
  salirEnCamino,
} from './flujo.rules';

const ahora = new Date(2026, 9, 26, 20, 0);

const base: Pedido = {
  id: 'p1', numero: 1, zona: 'muniz', kioscoId: 'k3', kioscoNombre: 'K', kioscoDireccion: '', usuarioId: 'u1',
  destino: { nombre: 'M', direccion: 'Calle 1' },
  items: [
    { productoId: 'k3-p1', nombre: 'Coca', cantidad: 4, precioUnitario: 2800 },
    { productoId: 'k3-p7', nombre: 'Hielo', cantidad: 3, precioUnitario: 1500 },
  ],
  costoEnvio: 1500, distanciaKm: 1, propina: 0, gananciaRider: 1500, pago: 'pendiente', aliasKiosco: 'a',
  comisionFreeDeli: 1570, pin: '1234', estado: 'esperando', fase: 'stock', creadoEn: ahora,
};

function paso(r: ReturnType<typeof confirmarStock>): Pedido {
  if (!r.ok) throw new Error(r.error);
  return r.pedido;
}

describe('flujo del pedido', () => {
  it('camino feliz: stock → transferencia → rider → aprobación → retiro doble → camino → entrega', () => {
    let p = paso(confirmarStock(base, [], 10));
    expect(p.fase).toBe('transferencia');
    expect(quienDebeActuar(p)).toBe('kiosco');
    p = paso(confirmarTransferencia(p));
    expect(p).toMatchObject({ pago: 'transferido', fase: 'rider' });
    p = paso(asignarRider(p, 'r1'));
    expect(p).toMatchObject({ riderId: 'r1', fase: 'aprobacion', estado: 'esperando' });
    p = paso(aprobarRider(p, true, ahora));
    expect(p).toMatchObject({ estado: 'aceptado', fase: undefined, aceptadoEn: ahora });
    expect(quienDebeActuar(p)).toBe('kiosco-y-rider');
    p = paso(confirmarRetiro(p, 'rider', ahora));
    expect(p.estado).toBe('aceptado');
    expect(quienDebeActuar(p)).toBe('kiosco');
    p = paso(confirmarRetiro(p, 'kiosco', ahora));
    expect(p.estado).toBe('retirado');
    p = paso(salirEnCamino(p));
    expect(entregarConPin(p, '0000', ahora)).toEqual({ ok: false, error: 'PIN incorrecto.' });
    p = paso(entregarConPin(p, '1234', ahora));
    expect(p).toMatchObject({ estado: 'entregado', pago: 'liberado' });
  });

  it('si falta stock quita los productos, recalcula la comisión y espera al cliente', () => {
    const p = paso(confirmarStock(base, ['k3-p7'], 10));
    expect(p.fase).toBe('ajuste');
    expect(p.items.map((i) => i.productoId)).toEqual(['k3-p1']);
    expect(p.itemsQuitados?.map((i) => i.productoId)).toEqual(['k3-p7']);
    expect(p.comisionFreeDeli).toBe(1500);
    expect(quienDebeActuar(p)).toBe('cliente');
    expect(paso(aceptarAjuste(p)).fase).toBe('transferencia');
    expect(paso(cancelarPorCliente(p)).estado).toBe('cancelado');
  });

  it('sin ningún producto en stock se cancela', () => {
    expect(paso(confirmarStock(base, ['k3-p1', 'k3-p7'], 10)).estado).toBe('cancelado');
  });

  it('el kiosco puede rechazar al rider y no se le vuelve a ofrecer', () => {
    let p = paso(confirmarTransferencia(paso(confirmarStock(base, [], 10))));
    p = paso(asignarRider(p, 'r1'));
    p = paso(aprobarRider(p, false, ahora));
    expect(p).toMatchObject({ fase: 'rider', riderId: undefined, ridersRechazados: ['r1'] });
    expect(asignarRider(p, 'r1').ok).toBe(false);
    expect(asignarRider(p, 'r2').ok).toBe(true);
  });

  it('no se puede cancelar después de buscar rider', () => {
    const p = paso(confirmarTransferencia(paso(confirmarStock(base, [], 10))));
    expect(cancelarPorCliente(p).ok).toBe(false);
  });
});
