import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Ingreso } from '@freedeli/shared';

@Component({
  selector: 'fd-ingresar',
  imports: [Ingreso],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fd-ingreso logo="brand/freedeli-moto.svg" rol="USUARIO" destino="/inicio" />`,
})
export default class Ingresar {}
