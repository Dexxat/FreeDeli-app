import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import { API_URL, dniValido, emailValido, nombreCompletoValido, telefonoValido } from '@freedeli/shared';
import { UsuarioStore } from '../../core/usuario.store';

function regla(valida: (v: string) => boolean): ValidatorFn {
  return (c: AbstractControl) => (valida(String(c.value ?? '')) ? null : { invalido: true });
}

/** Datos personales de la cuenta y cierre de sesión. */
@Component({
  selector: 'fd-ajustes',
  imports: [ReactiveFormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.scss',
})
export default class Ajustes {
  protected readonly store = inject(UsuarioStore);
  private readonly router = inject(Router);
  protected readonly conApi = !!inject(API_URL, { optional: true });

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', regla(nombreCompletoValido)],
    dni: ['', regla(dniValido)],
    email: ['', regla(emailValido)],
    telefono: ['', regla(telefonoValido)],
  });
  protected readonly enviado = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly guardado = signal(false);

  constructor() {
    // Carga los datos actuales cuando llega el perfil.
    effect(() => {
      const u = this.store.usuario();
      if (u) this.form.reset({ nombre: u.nombre, dni: u.dni, email: u.email, telefono: u.telefono });
    });
  }

  protected invalido(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.enviado());
  }

  protected async guardar(): Promise<void> {
    this.enviado.set(true);
    this.guardado.set(false);
    if (this.form.invalid) return;
    const datos = this.form.getRawValue();
    const error = await this.store.actualizarDatos({ ...datos, nombre: datos.nombre.trim(), email: datos.email.trim() });
    this.error.set(error);
    this.guardado.set(!error);
  }

  protected salir(): void {
    this.store.cerrarSesion();
    void this.router.navigateByUrl('/ingresar');
  }
}
