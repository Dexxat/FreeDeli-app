import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map } from 'rxjs';
import { ICONOS, ItemNav, NavInferior } from '@freedeli/shared';
import { RiderStore } from './core/rider.store';
import { OfertaEntrante } from './layout/oferta-entrante';
import { RiderHeader } from './layout/rider-header';

const SECCIONES: readonly ItemNav[] = [
  { ruta: '/inicio', etiqueta: 'INICIO', icono: ICONOS.inicio },
  { ruta: '/vivo', etiqueta: 'VIVO', icono: ICONOS.vivo },
  { ruta: '/historial', etiqueta: 'HISTORIAL', icono: ICONOS.lista },
  { ruta: '/ganancias', etiqueta: 'GANANCIAS', icono: ICONOS.pesos },
  { ruta: '/perfil', etiqueta: 'PERFIL', icono: ICONOS.perfil },
];

@Component({
  selector: 'fd-root',
  imports: [RouterOutlet, RiderHeader, NavInferior, OfertaEntrante],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sinShell()) {
      <router-outlet />
    } @else {
      <div class="app">
        <fd-rider-header [disponible]="store.disponible()" />
        <main class="contenido">
          <router-outlet />
        </main>
        <fd-nav-inferior [items]="secciones" />
        <fd-oferta-entrante />
      </div>
    }
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
    .contenido {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 20px 16px 24px;
    }
  `,
})
export class App {
  protected readonly store = inject(RiderStore);
  private readonly router = inject(Router);

  /** Ingreso, registro y espera de aprobación van sin header ni navegación. */
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
  protected readonly secciones = SECCIONES;
}
