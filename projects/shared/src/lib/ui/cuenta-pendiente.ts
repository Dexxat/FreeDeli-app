import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthApi, mensajeDeError } from '../http/auth.api';
import { SesionService } from '../http/sesion';

/** Kioscos y riders se registran y esperan la aprobación de FreeDeli. */
@Component({
  selector: 'fd-cuenta-pendiente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="pantalla">
      <section class="caja" aria-live="polite">
        @if (sesion.cuenta()?.estado === 'RECHAZADA') {
          <h1 class="titulo">ALTA NO APROBADA</h1>
          <p class="texto">FreeDeli no aprobó esta cuenta. Escribinos por WhatsApp si creés que es un error.</p>
        } @else {
          <h1 class="titulo">ESPERANDO APROBACIÓN</h1>
          <p class="texto">Recibimos tu alta. FreeDeli la revisa y te avisamos por WhatsApp. Cuando esté aprobada vas a poder empezar.</p>
          <button type="button" class="boton" [disabled]="revisando()" (click)="revisar()">{{ revisando() ? 'REVISANDO…' : 'YA ME APROBARON' }}</button>
        }
        @if (mensaje(); as m) { <p class="mensaje" role="status">{{ m }}</p> }
        <button type="button" class="salir" (click)="salir()">Cerrar sesión</button>
      </section>
    </main>
  `,
  styles: `
    .pantalla { min-height: 100dvh; padding: 32px 16px; display: flex; align-items: center; justify-content: center; background: var(--fd-navy-800); }
    .caja { width: 100%; max-width: 400px; padding: 24px 20px; display: flex; flex-direction: column; gap: 16px; background: var(--fd-navy-700); box-shadow: inset 4px 0 0 var(--fd-yellow-400); }
    .titulo { margin: 0; font-family: var(--fd-font-pixel); font-size: 13px; line-height: 1.5; color: var(--fd-yellow-400); }
    .texto { margin: 0; font-size: 15px; line-height: 1.5; }
    .mensaje { margin: 0; font-size: 14px; font-weight: 600; color: var(--fd-blue-300); }
    button { border: none; cursor: pointer; font: inherit; }
    button:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: 2px; }
    .boton { min-height: 52px; background: var(--fd-yellow-400); color: var(--fd-navy-900); font-family: var(--fd-font-pixel); font-size: 11px; }
    .boton:disabled { opacity: 0.6; cursor: progress; }
    .salir { align-self: flex-start; min-height: 44px; background: none; color: var(--fd-blue-300); font-weight: 600; text-decoration: underline; }
  `,
})
export class CuentaPendiente {
  private readonly auth = inject(AuthApi);
  private readonly router = inject(Router);
  protected readonly sesion = inject(SesionService);
  readonly destino = input('/');

  protected readonly revisando = signal(false);
  protected readonly mensaje = signal<string | null>(null);

  protected revisar(): void {
    this.revisando.set(true);
    this.mensaje.set(null);
    this.auth.yo().subscribe({
      next: (c) => {
        this.revisando.set(false);
        if (c.estado === 'APROBADA') {
          void this.router.navigateByUrl(this.destino());
        } else if (c.estado === 'PENDIENTE') {
          this.mensaje.set('Todavía no. Te avisamos apenas esté lista.');
        }
      },
      error: (e) => {
        this.revisando.set(false);
        this.mensaje.set(mensajeDeError(e));
      },
    });
  }

  protected salir(): void {
    this.sesion.cerrar();
    void this.router.navigateByUrl('/ingresar');
  }
}
