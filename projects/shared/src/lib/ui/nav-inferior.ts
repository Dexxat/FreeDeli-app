import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

export interface ItemNav {
  ruta: string;
  etiqueta: string;
  /** Rectángulos del ícono pixel en una grilla de 20×20: [x, y, ancho, alto]. */
  icono: [number, number, number, number][];
}

/** Íconos pixel comunes a las apps. */
export const ICONOS = {
  inicio: [[9, 1, 2, 2], [7, 3, 6, 2], [5, 5, 10, 2], [3, 7, 14, 2], [5, 9, 10, 9]],
  vivo: [[8, 8, 4, 4], [4, 6, 2, 8], [14, 6, 2, 8], [0, 4, 2, 12], [18, 4, 2, 12]],
  lista: [[1, 3, 3, 3], [6, 3, 13, 3], [1, 9, 3, 3], [6, 9, 13, 3], [1, 15, 3, 3], [6, 15, 13, 3]],
  pesos: [[9, 1, 2, 18], [5, 4, 10, 2], [5, 6, 2, 3], [5, 9, 10, 2], [13, 11, 2, 3], [5, 14, 10, 2]],
  perfil: [[7, 2, 6, 6], [4, 11, 12, 2], [2, 13, 16, 5]],
  bolsa: [[3, 6, 14, 12], [6, 2, 2, 5], [12, 2, 2, 5], [6, 2, 8, 2]],
  engranaje: [[8, 1, 4, 3], [8, 16, 4, 3], [1, 8, 3, 4], [16, 8, 3, 4], [4, 4, 12, 4], [4, 12, 12, 4], [4, 8, 4, 4], [12, 8, 4, 4]],
} satisfies Record<string, ItemNav['icono']>;

/** Navegación inferior con íconos pixel. La sección activa se pinta de amarillo. */
@Component({
  selector: 'fd-nav-inferior',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Secciones" [style.grid-template-columns]="'repeat(' + items().length + ', minmax(0, 1fr))'">
      @for (s of items(); track s.ruta) {
        <a [routerLink]="s.ruta" routerLinkActive="activo" ariaCurrentWhenActive="page" [style.font-size.px]="items().length > 4 ? 7 : 8">
          <svg aria-hidden="true" viewBox="0 0 20 20" width="20" height="20" fill="currentColor" shape-rendering="crispEdges">
            @for (r of s.icono; track $index) {
              <rect [attr.x]="r[0]" [attr.y]="r[1]" [attr.width]="r[2]" [attr.height]="r[3]" />
            }
          </svg>
          {{ s.etiqueta }}
        </a>
      }
    </nav>
  `,
  styles: `
    nav {
      display: grid;
      padding-bottom: env(safe-area-inset-bottom);
      background: var(--fd-navy-900);
      border-top: 4px solid var(--fd-navy-700);
    }
    a {
      min-height: 64px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
      color: var(--fd-blue-100);
      text-decoration: none;
      font-family: var(--fd-font-pixel);
    }
    a.activo { color: var(--fd-yellow-400); }
    a:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: -3px; }
  `,
})
export class NavInferior {
  readonly items = input.required<readonly ItemNav[]>();
}
