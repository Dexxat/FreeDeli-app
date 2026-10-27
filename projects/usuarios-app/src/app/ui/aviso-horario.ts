import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Horario } from '../core/horario';

/** Cartel que aparece fuera del horario nocturno. */
@Component({
  selector: 'fd-aviso-horario',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (!horario.abierto()) {
      <p class="aviso" role="status">
        <strong>FREEDELI ESTÁ CERRADO</strong>
        <span>Tomamos pedidos de {{ horario.texto }}. Volvé a la noche.</span>
      </p>
    }
  `,
  styles: `
    .aviso { margin: 0; padding: 12px; display: flex; flex-direction: column; gap: 4px; background: var(--fd-amber-400); color: var(--fd-navy-900); font-size: 13px; line-height: 1.4; }
    strong { font-family: var(--fd-font-pixel); font-size: 10px; }
  `,
})
export class AvisoHorario {
  protected readonly horario = inject(Horario);
}
