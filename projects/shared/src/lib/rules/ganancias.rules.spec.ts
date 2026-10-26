import { Pedido } from '../models/pedido';
import { resumirGanancias } from './ganancias.rules';
import { rangoPeriodo } from './periodos.rules';

const ahora = new Date(2026, 9, 26, 15, 0); // lunes 26/10/2026

function pedido(entregadoEn: Date, gananciaRider: number, propina = 0, estado: Pedido['estado'] = 'entregado'): Pedido {
  return {
    id: String(Math.random()), numero: 1, zona: 'muniz', kioscoId: 'k', kioscoNombre: 'K', kioscoDireccion: '',
    usuarioId: 'u', destino: { nombre: '', direccion: '' }, items: [], costoEnvio: 0, distanciaKm: 0, propina, gananciaRider, pago: 'liberado', aliasKiosco: '', comisionFreeDeli: 0,
    pin: '0000', estado, creadoEn: entregadoEn, entregadoEn,
  };
}

describe('rangoPeriodo', () => {
  it('mes pasado es el mes calendario anterior', () => {
    const r = rangoPeriodo('mes-pasado', ahora);
    expect(r.desde).toEqual(new Date(2026, 8, 1));
    expect(r.hasta).toEqual(new Date(2026, 9, 1));
  });
  it('semana son los últimos 7 días con hoy incluido', () => {
    const r = rangoPeriodo('semana', ahora);
    expect(r.desde).toEqual(new Date(2026, 9, 20));
    expect(r.hasta).toEqual(new Date(2026, 9, 27));
  });
});

describe('resumirGanancias', () => {
  const pedidos = [
    pedido(new Date(2026, 9, 26, 10, 30), 1000, 500),
    pedido(new Date(2026, 9, 26, 12, 0), 1200),
    pedido(new Date(2026, 9, 26, 13, 0), 900, 0, 'cancelado'),
    pedido(new Date(2026, 9, 25, 22, 0), 1500),
    pedido(new Date(2026, 8, 3, 20, 0), 2000, 300),
  ];

  it('jornada: envíos + propinas = total, solo entregados de hoy', () => {
    const r = resumirGanancias(pedidos, 'jornada', ahora, 3);
    expect(r.envios).toBe(2200);
    expect(r.propinas).toBe(500);
    expect(r.total).toBe(2700);
    expect(r.cantidadPedidos).toBe(2);
    expect(r.promedioPorPedido).toBe(1350);
    expect(r.barras).toHaveLength(24);
    expect(r.barras[10]).toEqual({ etiqueta: '10', monto: 1500 });
  });

  it('semana: una barra por día, terminando hoy', () => {
    const r = resumirGanancias(pedidos, 'semana', ahora, 20);
    expect(r.barras.map((b) => b.etiqueta)).toEqual(['Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom', 'Lun']);
    expect(r.barras[5].monto).toBe(1500);
    expect(r.total).toBe(4200);
  });

  it('mes pasado: barras por semana', () => {
    const r = resumirGanancias(pedidos, 'mes-pasado', ahora, 100);
    expect(r.barras.map((b) => b.etiqueta)).toEqual(['S1', 'S2', 'S3', 'S4', 'S5']);
    expect(r.barras[0].monto).toBe(2300);
    expect(r.total).toBe(2300);
  });
});
