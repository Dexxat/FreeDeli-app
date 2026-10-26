import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { API_URL, ICONOS, ItemNav, SesionService } from '@freedeli/shared';
import { filter, map } from 'rxjs';

const SECCIONES: readonly ItemNav[] = [
  { ruta: '/main', etiqueta: 'MAIN', icono: ICONOS.vivo },
  { ruta: '/ganancias', etiqueta: 'GANANCIAS', icono: ICONOS.pesos },
  { ruta: '/entregas', etiqueta: 'ENTREGAS', icono: ICONOS.lista },
];

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
        <a class="marca" routerLink="/main" aria-label="FreeDeli Dev, ir a MAIN">
          <span class="logo"><img src="brand/freedeli-piramide.svg" width="44" height="30" alt="" class="fd-pixel" /></span>
          <span class="nombre">Free<span class="deli">Deli</span><span class="dev">DEV</span></span>
        </a>
        <nav aria-label="Secciones">
          @for (s of secciones; track s.ruta) {
            <a [routerLink]="s.ruta" routerLinkActive="activo" ariaCurrentWhenActive="page">
              <svg aria-hidden="true" viewBox="0 0 20 20" width="18" height="18" fill="currentColor" shape-rendering="crispEdges">
                @for (r of s.icono; track $index) {
                  <rect [attr.x]="r[0]" [attr.y]="r[1]" [attr.width]="r[2]" [attr.height]="r[3]" />
                }
              </svg>
              {{ s.etiqueta }}
            </a>
          }
        </nav>
        <a class="whatsapp" href="https://web.whatsapp.com/" target="_blank" rel="noopener">Abrir WhatsApp de la empresa</a>
        @if (conApi) {
          <button type="button" class="salir" (click)="salir()">Cerrar sesión</button>
        }
      </aside>
      <main class="contenido">
        <router-outlet />
      </main>
    </div>
    }
  `,
  styles: `
    .app { min-height: 100dvh; display: grid; grid-template-columns: 240px minmax(0, 1fr); background: var(--fd-navy-800); }
    .lateral {
      position: sticky; top: 0; height: 100dvh;
      padding: 20px 14px;
      display: flex; flex-direction: column; gap: 24px;
      background: var(--fd-navy-900);
      border-right: 4px solid var(--fd-navy-700);
    }
    .marca { display: flex; align-items: center; gap: 10px; color: #fff; text-decoration: none; }
    .logo { width: 52px; height: 40px; display: flex; align-items: center; justify-content: center; background: var(--fd-blue-50); }
    .nombre { display: flex; flex-direction: column; gap: 6px; font-family: var(--fd-font-pixel); font-size: 13px; line-height: 1; }
    .deli { color: var(--fd-blue-300); }
    .dev { font-size: 8px; letter-spacing: 3px; color: var(--fd-yellow-400); }
    nav { display: flex; flex-direction: column; gap: 4px; }
    nav a {
      min-height: 44px; padding: 0 12px;
      display: flex; align-items: center; gap: 12px;
      color: var(--fd-blue-100); text-decoration: none;
      font-family: var(--fd-font-pixel); font-size: 9px;
    }
    nav a.activo { background: var(--fd-navy-700); color: var(--fd-yellow-400); box-shadow: inset 4px 0 0 var(--fd-yellow-400); }
    .salir { background: none; border: none; cursor: pointer; color: var(--fd-amber-400); font: inherit; font-size: 13px; font-weight: 700; text-align: left; }
    .whatsapp { margin-top: auto; padding: 12px; background: var(--fd-navy-700); color: #fff; font-size: 13px; font-weight: 600; text-align: center; text-decoration: none; }
    a:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: 2px; }
    .contenido { min-width: 0; padding: 28px 32px 40px; }

    @media (max-width: 760px) {
      .app { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto 1fr; }
      .lateral { position: static; height: auto; padding: 12px 16px; gap: 12px; border-right: none; border-bottom: 4px solid var(--fd-navy-700); }
      nav { flex-direction: row; overflow-x: auto; gap: 4px; }
      nav a { flex: 0 0 auto; }
      nav a.activo { box-shadow: inset 0 -4px 0 var(--fd-yellow-400); }
      .whatsapp { display: none; }
      .contenido { padding: 20px 16px 32px; }
    }
  `,
})
export class App {
  protected readonly secciones = SECCIONES;
  private readonly router = inject(Router);
  private readonly sesion = inject(SesionService);
  protected readonly conApi = !!inject(API_URL, { optional: true });

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

  protected salir(): void {
    this.sesion.cerrar();
    void this.router.navigateByUrl('/ingresar');
  }
}
