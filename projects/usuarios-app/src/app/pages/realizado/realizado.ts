import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BarraEstado, PesosPipe, UsuariosApi, cantidadProductos, codigoPedido, nombreZona, totalPedido } from '@freedeli/shared';
import { switchMap } from 'rxjs';

const TEXTO_ESTADO: Record<string, string> = {
  esperando: 'Buscando rider…',
  aceptado: 'Un rider aceptó tu pedido y va al kiosco.',
  retirado: 'El rider retiró tu pedido.',
  'en-camino': 'Tu pedido está en camino.',
  entregado: 'Pedido entregado.',
  cancelado: 'El pedido se canceló.',
};

@Component({
  selector: 'fd-realizado',
  imports: [BarraEstado, PesosPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './realizado.html',
  styleUrl: './realizado.scss',
})
export default class Realizado {
  private readonly api = inject(UsuariosApi);

  readonly pedidoId = input.required<string>();
  /** undefined mientras carga; null si no existe. */
  protected readonly pedido = toSignal(toObservable(this.pedidoId).pipe(switchMap((id) => this.api.pedido(id))));

  protected readonly codigo = codigoPedido;
  protected readonly zona = nombreZona;
  protected readonly cantidad = cantidadProductos;
  protected readonly total = totalPedido;
  protected readonly textoEstado = computed(() => TEXTO_ESTADO[this.pedido()?.estado ?? 'esperando']);
  protected readonly copiado = signal(false);

  protected async copiarAlias(alias: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(alias);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2500);
    } catch {
      this.copiado.set(false);
    }
  }
}
