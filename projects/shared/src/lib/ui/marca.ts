import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** Logo y nombre de FreeDeli arriba de las pantallas de ingreso. */
@Component({
  selector: 'fd-marca',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="logo"><img [src]="logo()" width="88" height="60" alt="" class="fd-pixel" /></span>
    <span class="nombre">Free<span class="deli">Deli</span></span>
    @if (subtitulo()) { <span class="sub">{{ subtitulo() }}</span> }
  `,
  styles: `
    :host { display: flex; flex-direction: column; align-items: center; gap: 12px; }
    .logo { width: 112px; height: 84px; display: flex; align-items: center; justify-content: center; background: var(--fd-blue-50); }
    .nombre { font-family: var(--fd-font-pixel); font-size: 22px; color: #fff; }
    .deli { color: var(--fd-blue-300); }
    .sub { font-family: var(--fd-font-pixel); font-size: 9px; letter-spacing: 3px; color: var(--fd-yellow-400); }
  `,
})
export class Marca {
  readonly logo = input.required<string>();
  readonly subtitulo = input('');
}
