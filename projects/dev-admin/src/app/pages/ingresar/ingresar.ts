import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Ingreso } from '@freedeli/shared';

/** Una sola cuenta: la del dueño. No hay registro. */
@Component({
  selector: 'fd-ingresar',
  imports: [Ingreso],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fd-ingreso logo="brand/freedeli-piramide.svg" subtitulo="DEV" rol="DEV" destino="/main" [rutaRegistro]="null" />`,
})
export default class Ingresar {}
