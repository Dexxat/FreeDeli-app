import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface ItemNav {
  ruta: string;
  etiqueta: string;
  /** Rectángulos del ícono pixel en una grilla de 20×20: [x, y, ancho, alto]. */
  icono: [number, number, number, number][];
}

export const SECCIONES: readonly ItemNav[] = [
  { ruta: '/inicio', etiqueta: 'INICIO', icono: [[9, 1, 2, 2], [7, 3, 6, 2], [5, 5, 10, 2], [3, 7, 14, 2], [5, 9, 10, 9]] },
  { ruta: '/vivo', etiqueta: 'VIVO', icono: [[8, 8, 4, 4], [4, 6, 2, 8], [14, 6, 2, 8], [0, 4, 2, 12], [18, 4, 2, 12]] },
  { ruta: '/historial', etiqueta: 'HISTORIAL', icono: [[1, 3, 3, 3], [6, 3, 13, 3], [1, 9, 3, 3], [6, 9, 13, 3], [1, 15, 3, 3], [6, 15, 13, 3]] },
  { ruta: '/ganancias', etiqueta: 'GANANCIAS', icono: [[9, 1, 2, 18], [5, 4, 10, 2], [5, 6, 2, 3], [5, 9, 10, 2], [13, 11, 2, 3], [5, 14, 10, 2]] },
  { ruta: '/perfil', etiqueta: 'PERFIL', icono: [[7, 2, 6, 6], [4, 11, 12, 2], [2, 13, 16, 5]] },
];

@Component({
  selector: 'fd-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <nav aria-label="Secciones">
      @for (s of secciones; track s.ruta) {
        <a [routerLink]="s.ruta" routerLinkActive="activo" ariaCurrentWhenActive="page">
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
      grid-template-columns: repeat(5, minmax(0, 1fr));
      padding-bottom: env(safe-area-inset-bottom);
      background: var(--fd-navy-900);
      border-top: 4px solid var(--fd-navy-700);
    }
    a {
      min-height: 64px;
      display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 7px;
      color: var(--fd-blue-100);
      text-decoration: none;
      font-family: var(--fd-font-pixel); font-size: 7px;
    }
    a.activo { color: var(--fd-yellow-400); }
    a:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: -3px; }
  `,
})
export class BottomNav {
  protected readonly secciones = SECCIONES;
}
