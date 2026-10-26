import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { ICONOS, ItemNav, NavInferior } from '@freedeli/shared';
import { filter, map, startWith } from 'rxjs';
import { UsuarioHeader } from './layout/usuario-header';

const SECCIONES: readonly ItemNav[] = [
  { ruta: '/inicio', etiqueta: 'INICIO', icono: ICONOS.inicio },
  { ruta: '/pedir', etiqueta: 'PEDIR', icono: ICONOS.bolsa },
  { ruta: '/pedido', etiqueta: 'MI PEDIDO', icono: ICONOS.vivo },
  { ruta: '/ajustes', etiqueta: 'AJUSTES', icono: ICONOS.engranaje },
];

/** Datos de ruta que usa el shell. */
export interface DatosShell {
  /** Ruta del link "< Volver" en el header. */
  volver?: string;
  /** Oculta la navegación inferior (por ejemplo, al armar el pedido). */
  sinNav?: boolean;
  /** Oculta el header (ingreso y registro). */
  sinHeader?: boolean;
}

@Component({
  selector: 'fd-root',
  imports: [RouterOutlet, UsuarioHeader, NavInferior],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app">
      @if (!shell().sinHeader) {
        <fd-usuario-header [volver]="shell().volver ?? null" />
      }
      <main class="contenido">
        <router-outlet />
      </main>
      @if (!shell().sinNav) {
        <fd-nav-inferior [items]="secciones" />
      }
    </div>
  `,
  styles: `
    :host { display: block; }
    .app {
      max-width: 430px;
      height: 100dvh;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      background: var(--fd-navy-800);
      overflow: hidden;
    }
    .contenido { flex: 1 1 auto; overflow-y: auto; display: flex; flex-direction: column; }
  `,
})
export class App {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly secciones = SECCIONES;

  /** Datos de la ruta más profunda activa. */
  protected readonly shell = toSignal(
    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      startWith(null),
      map(() => {
        let r = this.route.snapshot;
        while (r.firstChild) r = r.firstChild;
        return r.data as DatosShell;
      }),
    ),
    { initialValue: {} as DatosShell },
  );
}
