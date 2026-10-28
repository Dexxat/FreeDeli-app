import { Pedido } from '../models/pedido.js';
import { distanciaDelRider, posicionVigente, riderPasoLaMitad } from './ubicacion.rules.js';

const ahora = new Date(2026, 9, 28, 2, 0);
const segundos = (s: number) => new Date(ahora.getTime() - s * 1000);
const pedido = (estado: Pedido['estado'], en = ahora): Pick<Pedido, 'estado' | 'distanciaKm' | 'destino' | 'posicionRider'> => ({
  estado,
  distanciaKm: 2,
  destino: { nombre: 'M', direccion: 'Calle 1', ubicacion: { lat: -34.55, lng: -58.7 } },
  posicionRider: { lat: -34.559, lng: -58.7, en },
});

describe('posición del rider', () => {
  it('vale durante 2 minutos', () => {
    expect(posicionVigente(pedido('en-camino', segundos(120)), ahora)).toBeDefined();
    expect(posicionVigente(pedido('en-camino', segundos(121)), ahora)).toBeUndefined();
  });

  it('el cliente ve cuánto le falta al rider solo cuando está en camino', () => {
    expect(distanciaDelRider(pedido('en-camino'), ahora)).toBe(1);
    expect(distanciaDelRider(pedido('retirado'), ahora)).toBeUndefined();
  });

  it('a 1 km de un viaje de 2 km todavía no pasó la mitad', () => {
    expect(riderPasoLaMitad(pedido('en-camino'), ahora)).toBe(false);
    expect(riderPasoLaMitad({ ...pedido('en-camino'), distanciaKm: 2.1 }, ahora)).toBe(true);
  });
});
