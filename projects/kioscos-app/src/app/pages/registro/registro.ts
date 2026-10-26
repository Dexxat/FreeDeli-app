import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApi, RegistroKiosco, ZONAS, mensajeDeError } from '@freedeli/shared';

/** Alta de kiosco: queda pendiente hasta que FreeDeli la aprueba. */
@Component({
  selector: 'fd-registro',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="pantalla">
      <form class="caja" (ngSubmit)="crear()" novalidate>
        <h1 class="titulo">SUMÁ TU KIOSCO</h1>
        <p class="texto">FreeDeli revisa el alta y te avisa por WhatsApp. Para recibir pedidos vas a tener que cargar saldo.</p>
        <label class="campo">Nombre del kiosco<input name="nombre" [(ngModel)]="datos.nombre" /></label>
        <label class="campo">Dirección (calle y altura)<input name="direccion" autocomplete="street-address" [(ngModel)]="datos.direccion" /></label>
        <label class="campo">Zona
          <select name="zona" [(ngModel)]="datos.zona">
            @for (z of zonas; track z.id) { <option [value]="z.id">{{ z.nombre }}</option> }
          </select>
        </label>
        <label class="campo">Alias o CBU donde te transfieren los clientes<input name="aliasCobro" autocapitalize="none" [(ngModel)]="datos.aliasCobro" /></label>
        <label class="campo">Email<input name="email" type="email" autocomplete="email" [(ngModel)]="datos.email" /></label>
        <label class="campo">Contraseña (mínimo 8)<input name="clave" type="password" autocomplete="new-password" [(ngModel)]="datos.clave" /></label>
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

  protected readonly zonas = ZONAS;
  protected datos: RegistroKiosco = { nombre: '', direccion: '', zona: 'san-miguel', aliasCobro: '', email: '', clave: '' };
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected crear(): void {
    this.enviando.set(true);
    this.error.set(null);
    this.auth.registrarKiosco({ ...this.datos, email: this.datos.email.trim(), aliasCobro: this.datos.aliasCobro.trim() }).subscribe({
      next: () => void this.router.navigateByUrl('/pendiente'),
      error: (e) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e));
      },
    });
  }
}
