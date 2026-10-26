import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'fd-ajustes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<h1 class="titulo">AJUSTES</h1><p class="pendiente">Sección en construcción.</p>`,
  styles: `
    .titulo { margin: 0 0 12px; font-family: var(--fd-font-pixel); font-size: 14px; }
    .pendiente { margin: 0; color: var(--fd-blue-100); }
  `,
})
export default class Ajustes {}
