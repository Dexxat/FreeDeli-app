import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ResumenGanancias, provideFreeDeliMocks } from '@freedeli/shared';
import Ganancias, { barrasVisibles, formatearHoras } from './ganancias';

const esperar = () => new Promise((r) => setTimeout(r, 5));

function resumen(montos: number[]): ResumenGanancias {
  return {
    periodo: 'jornada', envios: 0, propinas: 0, total: 0, cantidadPedidos: 0, promedioPorPedido: 0, horasOnline: 0,
    barras: montos.map((monto, h) => ({ etiqueta: String(h).padStart(2, '0'), monto })),
  };
}

describe('Ganancias (Riders)', () => {
  it('formatea las horas online', () => {
    expect(formatearHoras(3.5)).toBe('3h 30m');
    expect(formatearHoras(26)).toBe('26h');
  });

  it('recorta la jornada desde la primera hora con ganancias hasta ahora', () => {
    const montos = Array(24).fill(0);
    montos[10] = 500;
    montos[12] = 900;
    const b = barrasVisibles(resumen(montos), 18);
    expect(b[0].etiqueta).toBe('10');
    expect(b.at(-1)!.etiqueta).toBe('18');
  });

  it('muestra al menos 6 horas aunque no haya ganancias', () => {
    expect(barrasVisibles(resumen(Array(24).fill(0)), 3).map((b) => b.etiqueta)).toEqual(['00', '01', '02', '03']);
    expect(barrasVisibles(resumen(Array(24).fill(0)), 15)).toHaveLength(6);
  });

  describe('pantalla', () => {
    let fixture: ComponentFixture<Ganancias>;
    let el: HTMLElement;

    async function estable() {
      for (let i = 0; i < 3; i++) {
        await esperar();
        await fixture.whenStable();
      }
    }

    beforeEach(async () => {
      TestBed.configureTestingModule({ imports: [Ganancias], providers: [provideFreeDeliMocks({ latencia: 0 })] });
      fixture = TestBed.createComponent(Ganancias);
      el = fixture.nativeElement;
      await estable();
    });

    it('envíos + propinas = total', () => {
      const [envios, propinas, total] = [...el.querySelectorAll('.renglon')].map((r) =>
        Number(r.lastElementChild!.textContent!.replace(/\D/g, '')),
      );
      expect(total).toBeGreaterThan(0);
      expect(envios + propinas).toBe(total);
    });

    it('el mes pasado se grafica por semana', async () => {
      [...el.querySelectorAll<HTMLButtonElement>('.filtros button')].find((b) => b.textContent?.includes('MES'))!.click();
      await estable();
      expect(el.querySelector('.subtitulo')?.textContent).toBe('POR SEMANA');
      expect(el.querySelector('.etiqueta')?.textContent).toBe('S1');
      expect(el.querySelectorAll('.barra.actual')).toHaveLength(1);
    });
  });
});
