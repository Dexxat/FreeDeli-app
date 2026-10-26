import { Injectable, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { DireccionEntrega, Usuario, UsuariosApi } from '@freedeli/shared';

/** Usuario con sesión iniciada y su pedido en curso, compartidos por las pantallas. */
@Injectable({ providedIn: 'root' })
export class UsuarioStore {
  private readonly api = inject(UsuariosApi);

  readonly usuario = signal<Usuario | null>(null);
  /** undefined mientras carga; null si no hay pedido abierto. */
  readonly pedidoEnCurso = toSignal(this.api.pedidoEnCurso());
  readonly guardando = signal(false);

  constructor() {
    this.api.perfil().subscribe((u) => this.usuario.set(u));
  }

  cambiarDireccion(direccion: DireccionEntrega): Promise<boolean> {
    this.guardando.set(true);
    return new Promise((resolver) =>
      this.api.cambiarDireccion(direccion).subscribe({
        next: (u) => {
          this.usuario.set(u);
          this.guardando.set(false);
          resolver(true);
        },
        error: () => {
          this.guardando.set(false);
          resolver(false);
        },
      }),
    );
  }
}
