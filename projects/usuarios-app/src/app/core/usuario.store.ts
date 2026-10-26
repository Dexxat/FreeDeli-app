import { Injectable, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DireccionEntrega, Pedido, SesionService, Usuario, UsuariosApi } from '@freedeli/shared';
import { catchError, of, switchMap } from 'rxjs';

/** Usuario con sesión iniciada y su pedido en curso. Se recargan al cambiar la sesión. */
@Injectable({ providedIn: 'root' })
export class UsuarioStore {
  private readonly api = inject(UsuariosApi);
  private readonly sesion = inject(SesionService);
  private readonly sesion$ = toObservable(this.sesion.token);

  readonly usuario = signal<Usuario | null>(null);
  /** undefined mientras carga; null si no hay pedido abierto. */
  readonly pedidoEnCurso = toSignal(
    this.sesion$.pipe(switchMap(() => this.api.pedidoEnCurso().pipe(catchError(() => of<Pedido | null>(null))))),
  );
  readonly guardando = signal(false);

  constructor() {
    this.sesion$
      .pipe(switchMap(() => this.api.perfil().pipe(catchError(() => of<Usuario | null>(null)))))
      .subscribe((u) => this.usuario.set(u));
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

  cerrarSesion(): void {
    this.sesion.cerrar();
    this.usuario.set(null);
  }
}
