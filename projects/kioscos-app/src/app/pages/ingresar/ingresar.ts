import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Ingreso } from '@freedeli/shared';

@Component({
  selector: 'fd-ingresar',
  imports: [Ingreso],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fd-ingreso logo="brand/freedeli-nube-kiosco.svg" subtitulo="KIOSCOS" rol="KIOSCO" destino="/inicio" />`,
})
export default class Ingresar {}
