import { Injectable, computed, inject, signal } from '@angular/core';
import { ErrorGps, Gps, Ubicacion } from '@freedeli/shared';

export type EstadoUbicacion = { tipo: 'buscando' } | { tipo: 'lista'; ubicacion: Ubicacion } | { tipo: 'error'; motivo: ErrorGps };

/** GPS del cliente: FreeDeli entrega donde está el celular. Sin ubicación no se puede pedir. */
@Injectable({ providedIn: 'root' })
export class UbicacionCliente {
  private readonly gps = inject(Gps);

  readonly estado = signal<EstadoUbicacion>({ tipo: 'buscando' });
  /** null mientras busca o si no hay ubicación. */
  readonly ubicacion = computed(() => {
    const e = this.estado();
    return e.tipo === 'lista' ? e.ubicacion : null;
  });

  constructor() {
    this.actualizar();
  }

  /** Vuelve a leer el GPS. Si ya había una ubicación, la mantiene mientras busca. */
  actualizar(): void {
    if (this.estado().tipo === 'error') this.estado.set({ tipo: 'buscando' });
    this.gps.posicion().then(
      (ubicacion) => this.estado.set({ tipo: 'lista', ubicacion }),
      (motivo: ErrorGps) => this.estado.set({ tipo: 'error', motivo }),
    );
  }
}
