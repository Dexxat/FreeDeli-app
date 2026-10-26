import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { RiderStore } from '../../core/rider.store';

/** Placeholder hasta que exista el login real. */
@Component({
  selector: 'fd-sesion-cerrada',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section>
      <p class="titulo">SESIÓN CERRADA</p>
      <p class="texto">Ya no vas a recibir pedidos en este dispositivo.</p>
      <button type="button" (click)="volver()">VOLVER A ENTRAR</button>
    </section>
  `,
  styles: `
    section { padding-top: 40px; display: flex; flex-direction: column; align-items: center; gap: 16px; text-align: center; }
    .titulo { margin: 0; font-family: var(--fd-font-pixel); font-size: 16px; color: var(--fd-yellow-400); }
    .texto { margin: 0; font-size: 14px; color: var(--fd-blue-100); }
    button {
      min-height: 52px; padding: 0 20px; border: none; cursor: pointer;
      background: var(--fd-yellow-400); color: var(--fd-navy-900);
      font-family: var(--fd-font-pixel); font-size: 10px;
    }
  `,
})
export default class SesionCerrada {
  private readonly store = inject(RiderStore);
  private readonly router = inject(Router);

  protected volver(): void {
    this.store.sesionCerrada.set(false);
    void this.router.navigateByUrl('/inicio');
  }
}
