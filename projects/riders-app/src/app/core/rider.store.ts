import { Injectable, computed, inject, signal } from '@angular/core';
import { Rider, RidersApi } from '@freedeli/shared';

/** Estado del rider con sesión iniciada, compartido por el header y las pantallas. */
@Injectable({ providedIn: 'root' })
export class RiderStore {
  private readonly api = inject(RidersApi);

  readonly rider = signal<Rider | null>(null);
  readonly disponible = computed(() => this.rider()?.disponible ?? false);

  constructor() {
    this.api.perfil().subscribe((r) => this.rider.set(r));
  }
}
