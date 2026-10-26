import { PEDIDO_MINIMO, calcularComision, confirmarStock, direccionAproximada } from './dominio.js';

describe('dominio compartido con las apps', () => {
  it('usa las mismas reglas', () => {
    expect(calcularComision(PEDIDO_MINIMO, 10)).toBe(1500);
    expect(direccionAproximada('Conesa 1890')).toBe('Conesa al 1800');
    expect(typeof confirmarStock).toBe('function');
  });
});
