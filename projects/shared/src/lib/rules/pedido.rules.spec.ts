import { PEDIDO_MINIMO, costoEnvio, distanciaKm, calcularComision, puedeRecibirPedidos, minutosParaLlegar, direccionAproximada, rangoTiempo, estadosDeBarra, generarPin, pinValido, siguienteEstado } from './pedido.rules.js';

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

describe('minutosParaLlegar', () => {
  const aceptadoEn = new Date(2026, 9, 26, 20, 0);
  it('sin rider no hay estimado', () => {
    expect(minutosParaLlegar({ estado: 'esperando' }, 25, aceptadoEn)).toBeNull();
  });
  it('descuenta el tiempo transcurrido desde que se aceptó', () => {
    expect(minutosParaLlegar({ estado: 'en-camino', aceptadoEn }, 25, new Date(2026, 9, 26, 20, 17))).toBe(8);
  });
  it('si se pasó del estimado muestra 1 minuto', () => {
    expect(minutosParaLlegar({ estado: 'en-camino', aceptadoEn }, 25, new Date(2026, 9, 26, 21, 0))).toBe(1);
  });
});

describe('puedeRecibirPedidos', () => {
  it('necesita estar abierto, sin pausa y con saldo para la comisión mínima', () => {
    expect(puedeRecibirPedidos({ abierto: true, pausado: false, saldo: 1500 })).toBe(true);
    expect(puedeRecibirPedidos({ abierto: true, pausado: false, saldo: 1499 })).toBe(false);
    expect(puedeRecibirPedidos({ abierto: true, pausado: true, saldo: 50000 })).toBe(false);
    expect(puedeRecibirPedidos({ abierto: false, pausado: false, saldo: 50000 })).toBe(false);
  });
  it('el pedido mínimo da justo la comisión mínima', () => {
    expect(calcularComision(PEDIDO_MINIMO, 10)).toBe(1500);
  });
});

describe('envío por distancia', () => {
  it('calcula la distancia en km', () => {
    expect(distanciaKm({ lat: -34.5433, lng: -58.7117 }, { lat: -34.5626, lng: -58.6895 })).toBe(3);
  });
  it('base + por km, redondeado a $100 para arriba', () => {
    expect(costoEnvio(0, { base: 1000, porKm: 400 })).toBe(1000);
    expect(costoEnvio(2.3, { base: 1000, porKm: 400 })).toBe(2000);
    expect(costoEnvio(2.6, { base: 1000, porKm: 400 })).toBe(2100);
  });
});
