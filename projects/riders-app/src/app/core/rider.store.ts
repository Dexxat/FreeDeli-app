import { Injectable, computed, inject, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { catchError, of, switchMap } from 'rxjs';
import { API_URL, CambiosPerfilRider, ErrorGps, Gps, Rider, RidersApi, SesionService, ZonaId, alternarZona } from '@freedeli/shared';

/** Por qué no se pudo pasar a ON sin ubicación. */
const SIN_GPS: Record<ErrorGps, string> = {
  'sin-permiso': 'Para conectarte, permití la ubicación para este sitio en la configuración del navegador. FreeDeli la usa mientras llevás un pedido.',
  'no-disponible': 'No encontramos tu ubicación. Prendé el GPS del celular para conectarte.',
};

/** Estado del rider con sesión iniciada, compartido por el header y las pantallas. */
@Injectable({ providedIn: 'root' })
export class RiderStore {
  private readonly api = inject(RidersApi);
  private readonly gps = inject(Gps);

  readonly rider = signal<Rider | null>(null);
  readonly disponible = computed(() => this.rider()?.disponible ?? false);
  readonly zonas = computed<ZonaId[]>(() => this.rider()?.zonas ?? []);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  private readonly sesion = inject(SesionService);
  private readonly conApi = !!inject(API_URL, { optional: true });

  constructor() {
    // Se recarga al iniciar o cerrar sesión. Con la API y sin sesión no hay rider.
    toObservable(this.sesion.token)
      .pipe(switchMap((token) => (this.conApi && !token ? of(null) : this.api.perfil().pipe(catchError(() => of(null))))))
      .subscribe((r) => this.rider.set(r));
  }

  /** Actualización optimista: se ve al instante y se revierte si la API falla. */
  private aplicar(cambio: Partial<Rider>, llamada: () => ReturnType<RidersApi['perfil']>): Promise<boolean> {
    const anterior = this.rider();
    if (!anterior) return Promise.resolve(false);
    this.error.set(null);
    this.rider.set({ ...anterior, ...cambio });
    this.guardando.set(true);
    return new Promise((resolver) =>
      llamada().subscribe({
        next: (r) => {
          this.rider.set(r);
          this.guardando.set(false);
          resolver(true);
        },
        error: (e: Error) => {
          this.rider.set(anterior);
          this.error.set(e.message);
          this.guardando.set(false);
          resolver(false);
        },
      }),
    );
  }

  /** Para pasar a ON hace falta la ubicación: la primera vez el navegador pide permiso. Devuelve si se pudo. */
  async alternarDisponible(): Promise<boolean> {
    const disponible = !this.disponible();
    if (disponible) {
      try {
        await this.gps.posicion();
      } catch (motivo) {
        this.error.set(SIN_GPS[motivo as ErrorGps] ?? SIN_GPS['no-disponible']);
        return false;
      }
    }
    return this.aplicar({ disponible }, () => this.api.setDisponible(disponible));
  }

  actualizarPerfil(cambios: CambiosPerfilRider): Promise<boolean> {
    return this.aplicar(cambios, () => this.api.actualizarPerfil(cambios));
  }

  /** Sin autenticación real todavía: se desconecta y queda marcado como sesión cerrada. */
  readonly sesionCerrada = signal(false);

  /** Pasa a OFF y cierra la sesión. Devuelve a dónde ir después. */
  async cerrarSesion(): Promise<string> {
    if (this.disponible()) {
      await this.aplicar({ disponible: false }, () => this.api.setDisponible(false));
    }
    if (this.conApi) {
      this.sesion.cerrar();
      return '/ingresar';
    }
    this.sesionCerrada.set(true);
    return '/sesion-cerrada';
  }

  /** Devuelve false si no se pudo porque era la última zona elegida. */
  alternarZona(zona: ZonaId): boolean {
    const actuales = this.zonas();
    const nuevas = alternarZona(actuales, zona);
    if (nuevas.length === actuales.length && nuevas.every((z, i) => z === actuales[i])) return false;
    void this.aplicar({ zonas: nuevas }, () => this.api.setZonas(nuevas));
    return true;
  }
}
