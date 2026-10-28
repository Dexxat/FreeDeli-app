import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthApi, mensajeDeError } from '../http/auth.api';
import { RolCuenta, SesionService } from '../http/sesion';
import { Marca } from './marca';

/** Pantalla del link del mail: elige la contraseña nueva y entra directo a la app. */
@Component({
  selector: 'fd-restablecer',
  imports: [FormsModule, RouterLink, Marca],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="pantalla">
      <fd-marca [logo]="logo()" [subtitulo]="subtitulo()" />

      @if (token) {
        <form class="caja" (ngSubmit)="guardar()" novalidate>
          <h1 class="titulo">CONTRASEÑA NUEVA</h1>
          <label class="campo">Contraseña nueva<input name="clave" type="password" autocomplete="new-password" [(ngModel)]="clave" required /></label>
          <label class="campo">Repetila<input name="repetida" type="password" autocomplete="new-password" [(ngModel)]="repetida" required /></label>
          @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
          <button type="submit" class="boton" [disabled]="enviando()">{{ enviando() ? 'GUARDANDO…' : 'GUARDAR Y ENTRAR' }}</button>
        </form>
      } @else {
        <section class="caja">
          <h1 class="titulo">LINK INVÁLIDO</h1>
          <p class="texto">Este link no sirve. Pedí uno nuevo.</p>
        </section>
      }
      @if (vencido() || !token) {
        <p class="pie"><a routerLink="/recuperar">Pedir otro link</a></p>
      }
    </main>
  `,
  styleUrl: './ingreso.scss',
})
export class Restablecer {
  private readonly auth = inject(AuthApi);
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);

  readonly logo = input.required<string>();
  readonly subtitulo = input('');
  /** Rol que puede usar esta app. */
  readonly rol = input.required<RolCuenta>();
  readonly destino = input('/');

  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token');
  protected clave = '';
  protected repetida = '';
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly vencido = signal(false);

  protected guardar(): void {
    if (this.clave.length < 8) {
      this.error.set('La contraseña tiene que tener al menos 8 caracteres.');
      return;
    }
    if (this.clave !== this.repetida) {
      this.error.set('Las dos contraseñas no coinciden.');
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.auth.restablecer(this.token!, this.clave).subscribe({
      next: (r) => {
        this.enviando.set(false);
        if (r.cuenta.rol !== this.rol()) {
          this.sesion.cerrar();
          this.error.set('Contraseña cambiada. Esta cuenta es de otra app de FreeDeli: ingresá desde esa app.');
          return;
        }
        void this.router.navigateByUrl(r.cuenta.estado === 'APROBADA' ? this.destino() : '/pendiente');
      },
      error: (e) => {
        this.enviando.set(false);
        this.vencido.set(true);
        this.error.set(mensajeDeError(e));
      },
    });
  }
}
