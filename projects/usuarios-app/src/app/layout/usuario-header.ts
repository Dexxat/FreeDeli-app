import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'fd-usuario-header',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="header">
      <a class="marca" routerLink="/inicio" aria-label="FreeDeli, ir al inicio">
        <span class="moto"><img src="brand/moto-header.svg" width="38" height="28" alt="" class="fd-pixel" /></span>
        <span class="nombre">Free<span class="deli">Deli</span></span>
      </a>
      @if (volver(); as ruta) {
        <a class="volver" [routerLink]="ruta">&lt; Volver</a>
      } @else {
        <span class="chip">24 HS</span>
      }
    </header>
  `,
  styles: `
    .header {
      display: flex; align-items: center; justify-content: space-between; gap: 12px;
      padding: 14px 16px;
      padding-top: max(14px, env(safe-area-inset-top));
      background: var(--fd-navy-900);
      border-bottom: 4px solid var(--fd-navy-700);
    }
    .marca { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; }
    .moto { width: 46px; height: 36px; display: flex; align-items: center; justify-content: center; background: var(--fd-blue-50); }
    .nombre { font-family: var(--fd-font-pixel); font-size: 13px; line-height: 1; }
    .deli { color: var(--fd-blue-300); }
    .chip { padding: 8px 10px; background: var(--fd-navy-700); color: var(--fd-yellow-400); font-family: var(--fd-font-pixel); font-size: 9px; line-height: 1; }
    .volver { min-height: 44px; display: flex; align-items: center; padding: 0 4px; color: var(--fd-blue-300); font-size: 14px; font-weight: 600; }
    a:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: 2px; }
  `,
})
export class UsuarioHeader {
  /** Ruta a la que vuelve el link "< Volver". Sin valor, se muestra el chip "24 HS". */
  readonly volver = input<string | null>(null);
}
