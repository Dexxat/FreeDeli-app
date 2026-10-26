import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { ICONOS, ItemNav } from '@freedeli/shared';

const SECCIONES: readonly ItemNav[] = [
  { ruta: '/inicio', etiqueta: 'INICIO', icono: ICONOS.vivo },
  { ruta: '/ganancias', etiqueta: 'GANANCIAS', icono: ICONOS.pesos },
  { ruta: '/pedidos', etiqueta: 'PEDIDOS', icono: ICONOS.lista },
  { ruta: '/ajustes', etiqueta: 'AJUSTES', icono: ICONOS.engranaje },
];

/** Pensada para tablet o compu en el mostrador: menú lateral; en celular, menú inferior. */
@Component({
  selector: 'fd-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sinShell()) {
      <router-outlet />
    } @else {
    <div class="app">
      <aside class="lateral">
        <a class="marca" routerLink="/inicio" aria-label="FreeDeli Kioscos, ir al inicio">
          <span class="logo"><img src="brand/freedeli-nube-kiosco.svg" width="44" height="30" alt="" class="fd-pixel" /></span>
          <span class="nombre">Free<span class="deli">Deli</span><span class="app-nombre">KIOSCOS</span></span>
        </a>
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
      </aside>
      <main class="contenido">
        <router-outlet />
      </main>
    </div>
    }
  `,
  styles: `
    .app { min-height: 100dvh; display: grid; grid-template-columns: 220px minmax(0, 1fr); background: var(--fd-navy-800); }
    .lateral {
      position: sticky; top: 0; height: 100dvh;
      padding: 20px 14px;
      display: flex; flex-direction: column; gap: 28px;
      background: var(--fd-navy-900);
      border-right: 4px solid var(--fd-navy-700);
    }
    .marca { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; }
    .logo { width: 52px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--fd-blue-50); }
    .nombre { display: flex; flex-direction: column; gap: 6px; font-family: var(--fd-font-pixel); font-size: 13px; line-height: 1; }
    .deli { color: var(--fd-blue-300); }
    .app-nombre { font-size: 8px; letter-spacing: 2px; color: var(--fd-yellow-400); }
    nav { display: flex; flex-direction: column; gap: 4px; }
    nav a {
      min-height: 52px; padding: 0 12px;
      display: flex; align-items: center; gap: 12px;
      color: var(--fd-blue-100); text-decoration: none;
      font-family: var(--fd-font-pixel); font-size: 10px;
    }
    nav a.activo { background: var(--fd-navy-700); color: var(--fd-yellow-400); box-shadow: inset 4px 0 0 var(--fd-yellow-400); }
    a:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: 2px; }
    .contenido { min-width: 0; padding: 28px 32px 40px; }

    @media (max-width: 760px) {
      .app { grid-template-columns: minmax(0, 1fr); grid-template-rows: 1fr auto; }
      .lateral {
        grid-row: 2; position: sticky; bottom: 0; top: auto; height: auto;
        padding: 0 0 env(safe-area-inset-bottom); gap: 0;
        border-right: none; border-top: 4px solid var(--fd-navy-700);
      }
      .marca { display: none; }
      nav { flex-direction: row; }
      nav a { flex: 1 1 0; min-height: 64px; flex-direction: column; justify-content: center; gap: 7px; font-size: 7px; }
      nav a.activo { box-shadow: none; background: none; }
      .contenido { grid-row: 1; padding: 20px 16px 24px; }
    }
  `,
})
export class App {
  protected readonly secciones = SECCIONES;
  private readonly router = inject(Router);

  /** Ingreso, alta y espera de aprobación van sin menú. */
  protected readonly sinShell = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map(() => {
        let r = this.router.routerState.snapshot.root;
        while (r.firstChild) r = r.firstChild;
        return !!r.data['sinShell'];
      }),
    ),
    { initialValue: true },
  );
}
