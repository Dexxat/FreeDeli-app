import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AdminApi, PeriodoAdmin, PesosPipe, formatearPesos, nombreZona } from '@freedeli/shared';
import { startWith, switchMap } from 'rxjs';
import { SelectorPeriodo } from '../../ui/zonas';

const LEYENDA: Record<PeriodoAdmin, string> = {
  jornada: 'Comisiones de la jornada de hoy',
  semana: 'Comisiones de los últimos 7 días',
  mes: 'Comisiones de este mes',
};

@Component({
  selector: 'fd-ganancias',
  imports: [PesosPipe, SelectorPeriodo],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ganancias.html',
  styleUrl: './ganancias.scss',
})
export default class Ganancias {
  private readonly api = inject(AdminApi);
  protected readonly periodo = signal<PeriodoAdmin>('jornada');
  protected readonly datos = toSignal(toObservable(this.periodo).pipe(switchMap((p) => this.api.ganancias(p).pipe(startWith(undefined)))));
  protected readonly leyenda = computed(() => LEYENDA[this.periodo()]);
  protected readonly zona = nombreZona;

  protected readonly barras = computed(() => {
    const bs = this.datos()?.barras ?? [];
    const max = Math.max(1, ...bs.map((b) => b.monto));
    return bs.map((b) => ({ ...b, alto: `${Math.max(2, Math.round((b.monto / max) * 100))}%` }));
  });

  protected readonly descripcion = computed(() =>
    (this.datos()?.barras ?? []).map((b) => `${b.etiqueta}: ${formatearPesos(b.monto)}`).join(', '),
  );
}
