import { Pedido } from '../models/pedido.js';
import {
  aceptarAjuste,
  aprobarRider,
  asignarRider,
  cancelarPorCliente,
  cancelarPorDev,
  confirmarRetiro,
  confirmarStock,
  confirmarTransferencia,
  entregarConPin,
  entregarSinPin,
  marcarReintegrado,
  quienDebeActuar,
  reportarPosicion,
  salirEnCamino,
  seguirEsperandoRider,
} from './flujo.rules.js';

const ahora = new Date(2026, 9, 26, 20, 0);

const base: Pedido = {
  id: 'p1', numero: 1, zona: 'muniz', kioscoId: 'k3', kioscoNombre: 'K', kioscoDireccion: '', usuarioId: 'u1',
  destino: { nombre: 'M', direccion: 'Calle 1', ubicacion: { lat: -34.55, lng: -58.7 } },
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
    p = paso(confirmarTransferencia(p, ahora));
    expect(p).toMatchObject({ pago: 'transferido', fase: 'rider', buscandoRiderDesde: ahora });
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
    p = paso(salirEnCamino(p, ahora));
    expect(p.enCaminoEn).toEqual(ahora);
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
    expect(paso(cancelarPorCliente(p, ahora)).cancelacion).toEqual({ motivo: 'cliente', reintegro: 0, riderCobra: false });
  });

  it('sin ningún producto en stock se cancela', () => {
    const p = paso(confirmarStock(base, ['k3-p1', 'k3-p7'], 10));
    expect(p).toMatchObject({ estado: 'cancelado', cancelacion: { motivo: 'sin-stock', reintegro: 0 } });
  });

  it('el kiosco puede rechazar al rider y no se le vuelve a ofrecer', () => {
    let p = pagado();
    p = paso(asignarRider(p, 'r1'));
    p = paso(aprobarRider(p, false, ahora));
    expect(p).toMatchObject({ fase: 'rider', riderId: undefined, ridersRechazados: ['r1'] });
    expect(asignarRider(p, 'r1').ok).toBe(false);
    expect(asignarRider(p, 'r2').ok).toBe(true);
  });

  describe('cancelaciones', () => {
    const total = 4 * 2800 + 3 * 1500 + 1500;
    const minutos = (m: number) => new Date(ahora.getTime() + m * 60_000);
    const enCamino = () => paso(salirEnCamino(paso(confirmarRetiro(paso(confirmarRetiro(paso(aprobarRider(paso(asignarRider(pagado(), 'r1')), true, ahora)), 'rider', ahora)), 'kiosco', ahora)), ahora));

    it('después de pagar, el cliente puede cancelar y se le devuelve todo', () => {
      expect(paso(cancelarPorCliente(pagado(), minutos(2))).cancelacion).toEqual({ motivo: 'cliente', reintegro: total, riderCobra: false });
    });

    // El kiosco está a 1 km: a 0,3 km del cliente el rider pasó la mitad; a 0,7 km, no.
    const cerca = { lat: -34.5473, lng: -58.7 };
    const lejos = { lat: -34.5437, lng: -58.7 };
    const conPosicion = (p: Pedido, u: { lat: number; lng: number }, en = ahora) => paso(reportarPosicion(p, u, en));

    it('si el GPS del rider dice que pasó la mitad del viaje, cobra el envío y se descuenta del reintegro', () => {
      expect(paso(cancelarPorCliente(conPosicion(enCamino(), cerca), minutos(1))).cancelacion).toEqual({ motivo: 'cliente', reintegro: total - 1500, riderCobra: true });
    });

    it('antes de la mitad, o sin una posición de los últimos 2 minutos, el rider no cobra', () => {
      expect(paso(cancelarPorCliente(conPosicion(enCamino(), lejos), ahora)).cancelacion?.riderCobra).toBe(false);
      expect(paso(cancelarPorCliente(conPosicion(enCamino(), cerca), minutos(3))).cancelacion?.riderCobra).toBe(false);
      expect(paso(cancelarPorCliente(enCamino(), ahora)).cancelacion?.riderCobra).toBe(false);
    });

    it('la mitad del viaje solo cuenta con el rider en camino', () => {
      const aceptado = paso(aprobarRider(paso(asignarRider(pagado(), 'r1')), true, ahora));
      expect(paso(cancelarPorCliente(conPosicion(aceptado, cerca), ahora)).cancelacion?.riderCobra).toBe(false);
    });

    it('el rider manda su posición solo con el pedido en curso', () => {
      expect(reportarPosicion(pagado(), cerca, ahora).ok).toBe(false);
      expect(conPosicion(enCamino(), cerca).posicionRider).toEqual({ ...cerca, en: ahora });
    });

    it('a los 10 minutos sin rider, cancelar no le cuenta en contra al cliente', () => {
      expect(paso(cancelarPorCliente(pagado(), minutos(9))).cancelacion?.motivo).toBe('cliente');
      expect(paso(cancelarPorCliente(pagado(), minutos(10))).cancelacion?.motivo).toBe('sin-rider');
    });

    it('seguir esperando reinicia los 10 minutos', () => {
      const p = paso(seguirEsperandoRider(pagado(), minutos(10)));
      expect(paso(cancelarPorCliente(p, minutos(15))).cancelacion?.motivo).toBe('cliente');
      expect(seguirEsperandoRider(base, ahora).ok).toBe(false);
    });

    it('un pedido entregado o cancelado ya no se cancela', () => {
      const cancelado = paso(cancelarPorCliente(base, ahora));
      expect(cancelarPorCliente(cancelado, ahora).ok).toBe(false);
      expect(cancelarPorDev(cancelado, 'dev').ok).toBe(false);
    });

    it('Dev cancela porque el rider no fue: reintegro total', () => {
      const p = paso(aprobarRider(paso(asignarRider(pagado(), 'r1')), true, ahora));
      expect(paso(cancelarPorDev(p, 'rider')).cancelacion).toEqual({ motivo: 'rider', reintegro: total, riderCobra: false });
      expect(cancelarPorDev(pagado(), 'rider').ok).toBe(false);
    });

    it('el kiosco marca el reintegro una sola vez', () => {
      const p = paso(marcarReintegrado(paso(cancelarPorCliente(pagado(), ahora)), minutos(5)));
      expect(p.cancelacion?.reintegradoEn).toEqual(minutos(5));
      expect(paso(marcarReintegrado(p, minutos(9))).cancelacion?.reintegradoEn).toEqual(minutos(5));
      expect(marcarReintegrado(paso(cancelarPorCliente(base, ahora)), ahora).ok).toBe(false);
    });
  });

  it('Dev marca entregado sin PIN solo si el rider ya lo retiró', () => {
    expect(paso(entregarSinPin(paso({ ok: true, pedido: { ...base, estado: 'en-camino' } }), ahora))).toMatchObject({ estado: 'entregado', pago: 'liberado' });
    expect(entregarSinPin(pagado(), ahora).ok).toBe(false);
  });
});

function pagado(): Pedido {
  return paso(confirmarTransferencia(paso(confirmarStock(base, [], 10)), ahora));
}
