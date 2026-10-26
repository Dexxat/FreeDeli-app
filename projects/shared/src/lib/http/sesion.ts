import { Injectable, computed, signal } from '@angular/core';

export type RolCuenta = 'USUARIO' | 'KIOSCO' | 'RIDER' | 'DEV';
export type EstadoCuenta = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA';

export interface Cuenta {
  id: string;
  email: string;
  rol: RolCuenta;
  estado: EstadoCuenta;
}

export interface RespuestaSesion {
  token: string;
  cuenta: Cuenta;
}

const CLAVE = 'freedeli.sesion';

/** Sesión de la cuenta: token y datos básicos. Se guarda en el navegador para no pedir login cada vez. */
@Injectable({ providedIn: 'root' })
export class SesionService {
  private readonly estado = signal<RespuestaSesion | null>(this.leer());

  readonly token = computed(() => this.estado()?.token ?? null);
  readonly cuenta = computed(() => this.estado()?.cuenta ?? null);
  readonly activa = computed(() => !!this.estado());

  iniciar(sesion: RespuestaSesion): void {
    this.estado.set(sesion);
    this.guardar(sesion);
  }

  /** Actualiza la cuenta (por ejemplo, cuando Dev la aprueba). */
  actualizarCuenta(cuenta: Cuenta): void {
    const actual = this.estado();
    if (!actual) return;
    this.iniciar({ ...actual, cuenta });
  }

  cerrar(): void {
    this.estado.set(null);
    this.guardar(null);
  }

  private leer(): RespuestaSesion | null {
    try {
      const crudo = localStorage.getItem(CLAVE);
      return crudo ? (JSON.parse(crudo) as RespuestaSesion) : null;
    } catch {
      return null;
    }
  }

  private guardar(sesion: RespuestaSesion | null): void {
    try {
      if (sesion) localStorage.setItem(CLAVE, JSON.stringify(sesion));
      else localStorage.removeItem(CLAVE);
    } catch {
      // Sin almacenamiento (modo privado): la sesión dura lo que la pestaña.
    }
  }
}
