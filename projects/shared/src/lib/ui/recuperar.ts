import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthApi, mensajeDeError } from '../http/auth.api';
import { Marca } from './marca';

/** "¿Olvidaste tu contraseña?": pide el link por mail. Igual en Usuarios, Kioscos y Riders. */
@Component({
  selector: 'fd-recuperar',
  imports: [FormsModule, RouterLink, Marca],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="pantalla">
      <fd-marca [logo]="logo()" [subtitulo]="subtitulo()" />

      @if (enviado()) {
        <section class="caja" role="status">
          <h1 class="titulo">REVISÁ TU MAIL</h1>
          <p class="texto">Si {{ email.trim() }} tiene una cuenta en FreeDeli, te mandamos un link para elegir una contraseña nueva. Vence en 30 minutos.</p>
          <p class="pie">¿No llegó? Mirá en correo no deseado o <button type="button" class="enlace" (click)="enviado.set(false)">pedilo de nuevo</button>.</p>
        </section>
      } @else {
        <form class="caja" (ngSubmit)="pedir()" novalidate>
          <h1 class="titulo">RECUPERAR CONTRASEÑA</h1>
          <p class="texto">Te mandamos un link para elegir una contraseña nueva.</p>
          <label class="campo">Email<input name="email" type="email" autocomplete="email" [(ngModel)]="email" required /></label>
          @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
          <button type="submit" class="boton" [disabled]="enviando()">{{ enviando() ? 'ENVIANDO…' : 'MANDAR LINK' }}</button>
        </form>
      }
      <p class="pie"><a routerLink="/ingresar">Volver a ingresar</a></p>
    </main>
  `,
  styleUrl: './ingreso.scss',
})
export class Recuperar {
  private readonly auth = inject(AuthApi);

  readonly logo = input.required<string>();
  readonly subtitulo = input('');

  protected email = '';
  protected readonly enviando = signal(false);
  protected readonly enviado = signal(false);
  protected readonly error = signal<string | null>(null);

  protected pedir(): void {
    if (!/^\S+@\S+\.\S+$/.test(this.email.trim())) {
      this.error.set('Ingresá un email válido.');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.auth.recuperar(this.email.trim()).subscribe({
      next: () => {
        this.enviando.set(false);
        this.enviado.set(true);
      },
      error: (e) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e));
      },
    });
  }
}
