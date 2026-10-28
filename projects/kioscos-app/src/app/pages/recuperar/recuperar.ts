import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Recuperar as RecuperarClave } from '@freedeli/shared';

@Component({
  selector: 'fd-recuperar-pagina',
  imports: [RecuperarClave],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<fd-recuperar logo="brand/freedeli-nube-kiosco.svg" subtitulo="KIOSCOS" />`,
})
export default class Recuperar {}
