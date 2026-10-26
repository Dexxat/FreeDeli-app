import { Injectable, computed, inject, signal } from '@angular/core';
import { Rider, RidersApi, ZonaId, alternarZona } from '@freedeli/shared';

/** Estado del rider con sesión iniciada, compartido por el header y las pantallas. */
@Injectable({ providedIn: 'root' })
export class RiderStore {
  private readonly api = inject(RidersApi);

  readonly rider = signal<Rider | null>(null);
  readonly disponible = computed(() => this.rider()?.disponible ?? false);
  readonly zonas = computed<ZonaId[]>(() => this.rider()?.zonas ?? []);
  readonly guardando = signal(false);
  readonly error = signal<string | null>(null);

  constructor() {
    this.api.perfil().subscribe((r) => this.rider.set(r));
  }

  /** Actualización optimista: se ve al instante y se revierte si la API falla. */
  private aplicar(cambio: Partial<Rider>, llamada: () => ReturnType<RidersApi['perfil']>): void {
    const anterior = this.rider();
    if (!anterior) return;
    this.error.set(null);
    this.rider.set({ ...anterior, ...cambio });
    this.guardando.set(true);
    llamada().subscribe({
      next: (r) => {
        this.rider.set(r);
        this.guardando.set(false);
      },
      error: (e: Error) => {
        this.rider.set(anterior);
        this.error.set(e.message);
        this.guardando.set(false);
      },
    });
  }

  alternarDisponible(): void {
    const disponible = !this.disponible();
    this.aplicar({ disponible }, () => this.api.setDisponible(disponible));
  }

  /** Devuelve false si no se pudo porque era la última zona elegida. */
  alternarZona(zona: ZonaId): boolean {
    const actuales = this.zonas();
    const nuevas = alternarZona(actuales, zona);
    if (nuevas.length === actuales.length && nuevas.every((z, i) => z === actuales[i])) return false;
    this.aplicar({ zonas: nuevas }, () => this.api.setZonas(nuevas));
    return true;
  }
}
