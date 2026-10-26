import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ZONAS, ZonaId, alternarZona } from '@freedeli/shared';

export const TODAS_LAS_ZONAS: ZonaId[] = ZONAS.map((z) => z.id);

/** "san-miguel,muniz" → ['san-miguel', 'muniz']. Vacío o inválido → las tres. */
export function zonasDeUrl(valor: string | undefined): ZonaId[] {
  const ids = (valor ?? '').split(',').filter((z): z is ZonaId => TODAS_LAS_ZONAS.includes(z as ZonaId));
  return ids.length ? TODAS_LAS_ZONAS.filter((z) => ids.includes(z)) : TODAS_LAS_ZONAS;
}

/** Selector de zonas: una, dos o las tres. Siempre queda al menos una. */
@Component({
  selector: 'fd-selector-zonas',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="zonas" role="group" aria-label="Zonas">
      @for (z of zonas; track z.id) {
        <button type="button" [attr.aria-pressed]="elegidas().includes(z.id)" (click)="alternar(z.id)">
          <span class="check" aria-hidden="true"></span>{{ z.nombre }}
        </button>
      }
    </div>
  `,
  styles: `
    .zonas { display: flex; flex-wrap: wrap; gap: 8px; }
    button {
      min-height: 40px; padding: 0 14px;
      display: inline-flex; align-items: center; gap: 8px;
      border: none; cursor: pointer;
      background: var(--fd-navy-700); color: var(--fd-blue-100);
      font: inherit; font-size: 13px; font-weight: 700;
      &[aria-pressed='true'] { background: var(--fd-yellow-400); color: var(--fd-navy-900); }
      &:focus-visible { outline: 3px solid var(--fd-cloud); outline-offset: 2px; }
    }
    .check { width: 12px; height: 12px; border: 2px solid currentColor; }
    [aria-pressed='true'] .check { background: currentColor; }
  `,
})
export class SelectorZonas {
  readonly elegidas = input.required<ZonaId[]>();
  readonly cambio = output<ZonaId[]>();
  protected readonly zonas = ZONAS;

  protected alternar(z: ZonaId): void {
    const nuevas = alternarZona(this.elegidas(), z);
    if (nuevas.length !== this.elegidas().length) this.cambio.emit(nuevas);
  }
}

/** Botones de período. */
@Component({
  selector: 'fd-selector-periodo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="periodos" role="group" aria-label="Período">
      @for (p of opciones; track p.id) {
        <button type="button" [attr.aria-pressed]="valor() === p.id" (click)="cambio.emit(p.id)">{{ p.etiqueta }}</button>
      }
    </div>
  `,
  styles: `
    .periodos { display: flex; gap: 6px; }
    button {
      min-height: 40px; padding: 0 14px;
      border: none; cursor: pointer;
      background: var(--fd-navy-700); color: var(--fd-blue-100);
      font-family: var(--fd-font-pixel); font-size: 9px;
      &[aria-pressed='true'] { background: var(--fd-yellow-400); color: var(--fd-navy-900); }
      &:focus-visible { outline: 3px solid var(--fd-cloud); outline-offset: 2px; }
    }
  `,
})
export class SelectorPeriodo {
  readonly valor = input.required<'jornada' | 'semana' | 'mes'>();
  readonly cambio = output<'jornada' | 'semana' | 'mes'>();
  protected readonly opciones = [
    { id: 'jornada', etiqueta: 'JORNADA' },
    { id: 'semana', etiqueta: 'SEMANA' },
    { id: 'mes', etiqueta: 'MES' },
  ] as const;
}

