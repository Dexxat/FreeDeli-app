import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'fd-perfil',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="titulo">PERFIL</h1>
    <p class="pendiente">Pantalla en construcción.</p>
  `,
  styles: `
    .titulo { margin: 0 0 12px; font-family: var(--fd-font-pixel); font-size: 11px; line-height: 1.4; color: var(--fd-blue-100); letter-spacing: 1px; }
    .pendiente { margin: 0; font-size: 14px; color: var(--fd-blue-100); }
  `,
})
export default class Perfil {}
