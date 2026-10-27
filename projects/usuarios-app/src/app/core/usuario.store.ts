import { Injectable, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { DatosPersonales, DireccionEntrega, Pedido, SesionService, Usuario, UsuariosApi, mensajeDeError } from '@freedeli/shared';
import { Observable, catchError, of, switchMap } from 'rxjs';

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

  cambiarDireccion(direccion: DireccionEntrega): Promise<string | null> {
    return this.guardar(this.api.cambiarDireccion(direccion));
  }

  actualizarDatos(datos: DatosPersonales): Promise<string | null> {
    return this.guardar(this.api.actualizarDatos(datos));
  }

  /** Guarda y actualiza el usuario. Devuelve null si salió bien, o el mensaje de error. */
  private guardar(cambio: Observable<Usuario>): Promise<string | null> {
    this.guardando.set(true);
    return new Promise((resolver) =>
      cambio.subscribe({
        next: (u) => {
          this.usuario.set(u);
          this.guardando.set(false);
          resolver(null);
        },
        error: (e: unknown) => {
          this.guardando.set(false);
          resolver(mensajeDeError(e));
        },
      }),
    );
  }

  cerrarSesion(): void {
    this.sesion.cerrar();
    this.usuario.set(null);
  }
}
