import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Restablecer as RestablecerClave } from '@freedeli/shared';

@Component({
  selector: 'fd-restablecer-pagina',
  imports: [RestablecerClave],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fd-restablecer logo="brand/freedeli-moto.svg" rol="USUARIO" destino="/inicio" />`,
})
export default class Restablecer {}
