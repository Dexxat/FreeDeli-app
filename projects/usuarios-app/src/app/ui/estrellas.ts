import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ESTRELLAS_PARA_PREMIO } from '@freedeli/shared';

/** Estrellas de FREEDELI RUSH hacia el premio: ★★★☆☆. */
@Component({
  selector: 'fd-estrellas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="estrellas" role="img" [attr.aria-label]="cantidad() + ' de ' + total + ' estrellas'">
      @for (llena of casillas(); track $index) {
        <span [class.llena]="llena" aria-hidden="true">★</span>
      }
    </span>
  `,
  styles: `
    .estrellas { display: inline-flex; gap: 4px; font-size: 20px; line-height: 1; color: var(--fd-navy-700); }
    .llena { color: var(--fd-yellow-400); }
  `,
})
export class Estrellas {
  readonly cantidad = input.required<number>();
  protected readonly total = ESTRELLAS_PARA_PREMIO;
  protected readonly casillas = computed(() => Array.from({ length: this.total }, (_, i) => i < this.cantidad()));
}
