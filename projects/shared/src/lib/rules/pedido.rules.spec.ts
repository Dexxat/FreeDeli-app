import { calcularComision, direccionAproximada, rangoTiempo, estadosDeBarra, generarPin, pinValido, siguienteEstado } from './pedido.rules';

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

describe('direccionAproximada', () => {
  it('redondea la altura a la centena', () => {
    expect(direccionAproximada('Conesa 1890')).toBe('Conesa al 1800');
    expect(direccionAproximada('Av. Pres. Perón 45')).toBe('Av. Pres. Perón al 0');
    expect(direccionAproximada('Belgrano 845, depto 2B')).toBe('Belgrano al 800');
  });
  it('sin altura devuelve la calle', () => {
    expect(direccionAproximada('Plaza San Martín')).toBe('Plaza San Martín');
  });
});

describe('rangoTiempo', () => {
  it('suma y resta 5 minutos', () => {
    expect(rangoTiempo(25)).toBe('20–30 min');
    expect(rangoTiempo(8)).toBe('5–13 min');
  });
});

describe('calcularComision', () => {
  it('nunca baja de $1.500', () => {
    expect(calcularComision(10000, 0)).toBe(1500);
    expect(calcularComision(10000, 10)).toBe(1500);
  });
  it('aplica el porcentaje cuando supera el mínimo', () => {
    expect(calcularComision(30000, 10)).toBe(3000);
  });
});
