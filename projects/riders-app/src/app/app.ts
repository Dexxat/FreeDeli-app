import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RiderStore } from './core/rider.store';
import { BottomNav } from './layout/bottom-nav';
import { OfertaEntrante } from './layout/oferta-entrante';
import { RiderHeader } from './layout/rider-header';

@Component({
  selector: 'fd-root',
  imports: [RouterOutlet, RiderHeader, BottomNav, OfertaEntrante],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="app">
      <fd-rider-header [disponible]="store.disponible()" />
      <main class="contenido">
        <router-outlet />
      </main>
      @if (!store.sesionCerrada()) {
        <fd-bottom-nav />
        <fd-oferta-entrante />
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
    .contenido {
      flex: 1 1 auto;
      overflow-y: auto;
      padding: 20px 16px 24px;
    }
  `,
})
export class App {
  protected readonly store = inject(RiderStore);
}
