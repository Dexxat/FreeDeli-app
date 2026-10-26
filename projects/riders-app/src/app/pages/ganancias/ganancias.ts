import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { BarraGanancia, PeriodoGanancias, PesosPipe, ResumenGanancias, RidersApi, formatearPesos } from '@freedeli/shared';
import { startWith, switchMap } from 'rxjs';

const PERIODOS: { id: PeriodoGanancias; etiqueta: string; leyenda: string; grafico: string }[] = [
  { id: 'jornada', etiqueta: 'JORNADA', leyenda: 'Ganancias de la jornada de hoy', grafico: 'POR HORA' },
  { id: 'semana', etiqueta: 'SEMANA', leyenda: 'Ganancias de los últimos 7 días', grafico: 'POR DÍA' },
  { id: 'mes-pasado', etiqueta: 'MES PASADO', leyenda: 'Ganancias del mes pasado', grafico: 'POR SEMANA' },
];

/** Alto máximo de una barra, en px. */
const ALTO_MAX = 100;
/** En la jornada se muestran como mínimo estas horas, para que el gráfico no quede vacío. */
const HORAS_MINIMAS = 6;

/** 3.5 → "3h 30m"; 26 → "26h". */
export function formatearHoras(horas: number): string {
  const h = Math.floor(horas);
  const m = Math.round((horas - h) * 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * En la jornada, recorta las 24 horas al tramo con actividad hasta la hora actual.
 * Semana y mes se muestran completos.
 */
export function barrasVisibles(r: ResumenGanancias, horaActual: number): BarraGanancia[] {
  if (r.periodo !== 'jornada') return r.barras;
  const primera = r.barras.findIndex((b) => b.monto > 0);
  const desde = Math.max(0, Math.min(primera === -1 ? horaActual : primera, horaActual - HORAS_MINIMAS + 1));
  return r.barras.slice(desde, horaActual + 1);
}

@Component({
  selector: 'fd-ganancias',
  imports: [PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ganancias.html',
  styleUrl: './ganancias.scss',
})
export default class Ganancias {
  private readonly api = inject(RidersApi);

  protected readonly periodos = PERIODOS;
  protected readonly periodo = signal<PeriodoGanancias>('jornada');
  protected readonly info = computed(() => PERIODOS.find((p) => p.id === this.periodo())!);

  /** undefined mientras carga. */
  protected readonly resumen = toSignal(
    toObservable(this.periodo).pipe(switchMap((p) => this.api.ganancias(p).pipe(startWith(undefined)))),
  );

  protected readonly horas = computed(() => formatearHoras(this.resumen()?.horasOnline ?? 0));

  protected readonly barras = computed(() => {
    const r = this.resumen();
    if (!r) return [];
    const visibles = barrasVisibles(r, new Date().getHours());
    const max = Math.max(1, ...visibles.map((b) => b.monto));
    return visibles.map((b, i) => ({
      etiqueta: b.etiqueta,
      alto: `${Math.max(4, Math.round((b.monto / max) * ALTO_MAX))}px`,
      actual: i === visibles.length - 1,
    }));
  });

  protected readonly descripcionGrafico = computed(() => {
    const r = this.resumen();
    if (!r) return '';
    return `Ganancias ${this.info().grafico.toLowerCase()}: ` +
      barrasVisibles(r, new Date().getHours()).map((b) => `${b.etiqueta} ${formatearPesos(b.monto)}`).join(', ');
  });
}
