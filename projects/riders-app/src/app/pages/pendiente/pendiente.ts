import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CuentaPendiente } from '@freedeli/shared';

@Component({
  selector: 'fd-pendiente',
  imports: [CuentaPendiente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fd-cuenta-pendiente destino="/inicio" />`,
})
export default class Pendiente {}
