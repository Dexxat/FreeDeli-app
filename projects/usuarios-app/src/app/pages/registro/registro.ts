import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthApi, RegistroUsuario, ZONAS, mensajeDeError } from '@freedeli/shared';

@Component({
  selector: 'fd-registro',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './registro.html',
  styleUrl: './registro.scss',
})
export default class Registro {
  private readonly auth = inject(AuthApi);
  private readonly router = inject(Router);

  protected readonly zonas = ZONAS;
  protected datos: RegistroUsuario = { nombre: '', telefono: '', email: '', clave: '', direccion: '', notas: '', zona: 'san-miguel' };
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected crear(): void {
    this.enviando.set(true);
    this.error.set(null);
    const { notas, ...resto } = this.datos;
    this.auth.registrarUsuario({ ...resto, email: resto.email.trim(), notas: notas?.trim() || undefined }).subscribe({
      next: () => void this.router.navigateByUrl('/inicio'),
      error: (e) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e));
      },
    });
  }
}
