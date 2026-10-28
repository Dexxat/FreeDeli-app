import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApi, mensajeDeError } from '../http/auth.api';
import { RolCuenta, SesionService } from '../http/sesion';
import { Marca } from './marca';

/** Pantalla de ingreso con email y contraseña, igual en las cuatro apps. */
@Component({
  selector: 'fd-ingreso',
  imports: [FormsModule, RouterLink, Marca],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="pantalla">
      <fd-marca [logo]="logo()" [subtitulo]="subtitulo()" />

      <form class="caja" (ngSubmit)="ingresar()" novalidate>
        <h1 class="titulo">INGRESAR</h1>
        <label class="campo">Email<input name="email" type="email" autocomplete="email" [(ngModel)]="email" required /></label>
        <label class="campo">Contraseña<input name="clave" type="password" autocomplete="current-password" [(ngModel)]="clave" required /></label>
        @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
        <button type="submit" class="boton" [disabled]="enviando()">{{ enviando() ? 'INGRESANDO…' : 'INGRESAR' }}</button>
        @if (rutaRecuperar()) {
          <p class="pie"><a [routerLink]="rutaRecuperar()">¿Olvidaste tu contraseña?</a></p>
        }
        @if (rutaRegistro()) {
          <p class="pie">¿No tenés cuenta? <a [routerLink]="rutaRegistro()">Crear cuenta</a></p>
        }
      </form>
    </main>
  `,
  styleUrl: './ingreso.scss',
})
export class Ingreso {
  private readonly auth = inject(AuthApi);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  readonly logo = input.required<string>();
  readonly subtitulo = input<string>('');
  /** Rol que puede usar esta app. */
  readonly rol = input.required<RolCuenta>();
  readonly destino = input('/');
  readonly rutaRegistro = input<string | null>('/registro');
  /** Dev no recupera la contraseña por mail. */
  readonly rutaRecuperar = input<string | null>('/recuperar');

  protected email = '';
  protected clave = '';
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected ingresar(): void {
    if (!this.email.trim() || !this.clave) {
      this.error.set('Completá el email y la contraseña.');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.auth.ingresar(this.email.trim(), this.clave).subscribe({
      next: (r) => {
        this.enviando.set(false);
        if (r.cuenta.rol !== this.rol()) {
          this.sesion.cerrar();
          this.error.set('Esta cuenta es de otra app de FreeDeli.');
          return;
        }
        void this.router.navigateByUrl(r.cuenta.estado === 'APROBADA' ? this.destino() : '/pendiente');
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e));
      },
    });
  }
}
