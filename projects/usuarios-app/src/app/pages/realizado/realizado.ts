import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { BarraEstado, PesosPipe, UsuariosApi, cantidadProductos, codigoPedido, nombreZona, totalPedido } from '@freedeli/shared';
import { switchMap } from 'rxjs';
import { PasoActual } from '../../ui/paso-actual';


@Component({
  selector: 'fd-realizado',
  imports: [BarraEstado, PesosPipe, RouterLink, PasoActual],
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
}
