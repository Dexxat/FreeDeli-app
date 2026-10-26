import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { API_URL } from '@freedeli/shared';
import { UsuarioStore } from '../../core/usuario.store';

/** Ajustes: pendiente de definir. Por ahora, datos de la cuenta y cerrar sesión. */
@Component({
  selector: 'fd-ajustes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="titulo">AJUSTES</h1>
    @if (store.usuario(); as u) {
      <p class="dato">{{ u.nombre }} · {{ u.email }}</p>
    }
    <p class="pendiente">Más opciones en construcción.</p>
    @if (conApi) {
      <button type="button" class="salir" (click)="salir()">Cerrar sesión</button>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 12px; padding: 20px 16px 24px; }
    .titulo { margin: 0; font-family: var(--fd-font-pixel); font-size: 12px; line-height: 1.4; }
    .dato { margin: 0; font-size: 15px; }
    .pendiente { margin: 0; font-size: 14px; color: var(--fd-blue-100); }
    .salir { align-self: flex-start; min-height: 48px; padding: 0 16px; border: none; cursor: pointer; background: var(--fd-navy-700); color: var(--fd-amber-400); font: inherit; font-weight: 700; }
    .salir:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: 2px; }
  `,
})
export default class Ajustes {
  protected readonly store = inject(UsuarioStore);
  private readonly router = inject(Router);
  protected readonly conApi = !!inject(API_URL, { optional: true });

  protected salir(): void {
    this.store.cerrarSesion();
    void this.router.navigateByUrl('/ingresar');
  }
}
