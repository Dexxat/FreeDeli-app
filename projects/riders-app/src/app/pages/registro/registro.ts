import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApi, RegistroRider, mensajeDeError } from '@freedeli/shared';

/** Alta de rider: queda pendiente hasta que FreeDeli la aprueba. */
@Component({
  selector: 'fd-registro',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="pantalla">
      <form class="caja" (ngSubmit)="crear()" novalidate>
        <h1 class="titulo">QUIERO SER RIDER</h1>
        <p class="texto">Completá tus datos. FreeDeli revisa el alta y te avisa por WhatsApp.</p>
        <label class="campo">Nombre y apellido<input name="nombre" autocomplete="name" [(ngModel)]="datos.nombre" /></label>
        <label class="campo">Teléfono<input name="telefono" type="tel" autocomplete="tel" [(ngModel)]="datos.telefono" /></label>
        <label class="campo">DNI<input name="dni" inputmode="numeric" [(ngModel)]="datos.dni" /></label>
        <label class="campo">Email<input name="email" type="email" autocomplete="email" [(ngModel)]="datos.email" /></label>
        <label class="campo">Contraseña (mínimo 8)<input name="clave" type="password" autocomplete="new-password" [(ngModel)]="datos.clave" /></label>
        <label class="campo">Moto (marca y modelo)<input name="vehiculoModelo" [(ngModel)]="datos.vehiculoModelo" /></label>
        <label class="campo">Patente<input name="patente" autocapitalize="characters" [(ngModel)]="datos.patente" /></label>
        <label class="campo">Alias o CBU para cobrar<input name="aliasCbu" autocapitalize="none" [(ngModel)]="datos.aliasCbu" /></label>
        @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
        <button type="submit" class="boton" [disabled]="enviando()">{{ enviando() ? 'ENVIANDO…' : 'PEDIR ALTA' }}</button>
        <p class="pie">¿Ya tenés cuenta? <a routerLink="/ingresar">Ingresar</a></p>
      </form>
    </main>
  `,
  styleUrl: './registro.scss',
})
export default class Registro {
  private readonly auth = inject(AuthApi);
  private readonly router = inject(Router);

  protected datos: RegistroRider = { nombre: '', telefono: '', dni: '', email: '', clave: '', vehiculoModelo: '', patente: '', aliasCbu: '' };
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected crear(): void {
    this.enviando.set(true);
    this.error.set(null);
    this.auth
      .registrarRider({ ...this.datos, email: this.datos.email.trim(), dni: this.datos.dni.replace(/\D/g, ''), patente: this.datos.patente.replace(/\s/g, '') })
      .subscribe({
        next: () => void this.router.navigateByUrl('/pendiente'),
        error: (e) => {
          this.enviando.set(false);
          this.error.set(mensajeDeError(e));
        },
      });
  }
}
