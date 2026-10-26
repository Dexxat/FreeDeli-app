import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Ingreso } from '@freedeli/shared';

@Component({
  selector: 'fd-ingresar',
  imports: [Ingreso],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fd-ingreso logo="brand/freedeli-casco.svg" subtitulo="RIDERS" rol="RIDER" destino="/inicio" />`,
})
export default class Ingresar {}
