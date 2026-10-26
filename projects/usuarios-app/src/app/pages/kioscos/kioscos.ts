import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'fd-kioscos',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="titulo">KIOSCOS ABIERTOS</h1>
    <p class="pendiente">Pantalla en construcción.</p>
  `,
  styles: `
    :host { display: block; padding: 20px 16px 24px; }
    .titulo { margin: 0 0 12px; font-family: var(--fd-font-pixel); font-size: 12px; line-height: 1.4; }
    .pendiente { margin: 0; font-size: 14px; color: var(--fd-blue-100); }
  `,
})
export default class Kioscos {}
