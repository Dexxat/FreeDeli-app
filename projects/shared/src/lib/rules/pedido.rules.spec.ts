import { estadosDeBarra, generarPin, pinValido, siguienteEstado } from './pedido.rules';

describe('PIN', () => {
  it('genera 4 dígitos con ceros a la izquierda', () => {
    expect(generarPin(() => 0.0042)).toBe('0042');
    expect(generarPin(() => 0.99999)).toBe('9999');
  });
  it('valida solo 4 dígitos', () => {
    expect(pinValido('1234')).toBe(true);
    expect(pinValido('123')).toBe(false);
    expect(pinValido('12a4')).toBe(false);
  });
});

describe('siguienteEstado', () => {
  it('sigue la secuencia hasta En camino', () => {
    expect(siguienteEstado('esperando')).toBe('aceptado');
    expect(siguienteEstado('aceptado')).toBe('retirado');
    expect(siguienteEstado('retirado')).toBe('en-camino');
  });
  it('Entregado solo se alcanza con el PIN', () => {
    expect(siguienteEstado('en-camino')).toBeNull();
    expect(siguienteEstado('entregado')).toBeNull();
    expect(siguienteEstado('cancelado')).toBeNull();
  });
});

describe('estadosDeBarra', () => {
  it('esperando: todo pendiente', () => {
    expect(estadosDeBarra('esperando')).toEqual({ aceptado: 'pendiente', retirado: 'pendiente', 'en-camino': 'pendiente', entregado: 'pendiente' });
  });
  it('retirado: aceptado completo, retirado actual', () => {
    expect(estadosDeBarra('retirado')).toEqual({ aceptado: 'completado', retirado: 'actual', 'en-camino': 'pendiente', entregado: 'pendiente' });
  });
  it('entregado: todo completo', () => {
    expect(estadosDeBarra('entregado')).toEqual({ aceptado: 'completado', retirado: 'completado', 'en-camino': 'completado', entregado: 'completado' });
  });
});
