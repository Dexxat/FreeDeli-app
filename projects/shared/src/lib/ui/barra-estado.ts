import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { EstadoPedido, PASOS_ESTADO } from '../models/pedido';
import { estadosDeBarra } from '../rules/pedido.rules';

/**
 * Barra de estado del pedido: Aceptado → Retirado → En camino → Entregado.
 * Es el mismo componente en Usuarios y en Riders.
 * Celeste = completado, amarillo = paso actual, oscuro = pendiente.
 */
@Component({
  selector: 'fd-barra-estado',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol aria-label="Progreso del pedido">
      @for (paso of pasos(); track paso.id) {
        <li [class]="paso.estado" [attr.aria-current]="paso.estado === 'actual' ? 'step' : null">
          <span class="segmento" aria-hidden="true"></span>
          <span class="etiqueta">
            {{ paso.etiqueta }}<span class="sr-only">{{ textoEstado[paso.estado] }}</span>
          </span>
        </li>
      }
    </ol>
  `,
  styles: `
    ol {
      margin: 0;
      padding: 0;
      list-style: none;
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 6px;
    }
    li { display: flex; flex-direction: column; gap: 6px; }
    .segmento { height: 10px; background: var(--fd-navy-900); }
    .etiqueta { font-family: var(--fd-font-body); font-size: 11px; color: var(--fd-blue-300); }
    .completado .segmento { background: var(--fd-blue-300); }
    .completado .etiqueta { color: var(--fd-blue-100); }
    .actual .segmento { background: var(--fd-yellow-400); }
    .actual .etiqueta { color: var(--fd-yellow-400); font-weight: 700; }
    .sr-only {
      position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
    }
  `,
})
export class BarraEstado {
  readonly estado = input.required<EstadoPedido>();

  protected readonly textoEstado = { completado: ' (completado)', actual: ' (paso actual)', pendiente: ' (pendiente)' };

  protected readonly pasos = computed(() => {
    const estados = estadosDeBarra(this.estado());
    return PASOS_ESTADO.map((p) => ({ ...p, estado: estados[p.id] }));
  });
}
