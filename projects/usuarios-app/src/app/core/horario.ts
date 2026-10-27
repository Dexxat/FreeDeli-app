import { HttpClient } from '@angular/common/http';
import { DestroyRef, Injectable, inject, signal } from '@angular/core';
import { API_URL, HORARIO_LIBRE, servicioAbierto, textoHorario } from '@freedeli/shared';

/**
 * Si FreeDeli está tomando pedidos ahora (00 a 08 hs). Se revisa cada 30 segundos.
 * Con la API real, el servidor dice si el horario está liberado (HORARIO_LIBRE en el backend).
 */
@Injectable({ providedIn: 'root' })
export class Horario {
  private readonly libre = signal(inject(HORARIO_LIBRE));
  private readonly calcular = () => this.libre() || servicioAbierto(new Date());

  readonly abierto = signal(this.calcular());
  readonly texto = textoHorario();

  constructor() {
    const url = inject(API_URL, { optional: true });
    const http = inject(HttpClient, { optional: true });
    if (url && http) {
      http.get<{ libre: boolean }>(`${url}/horario`).subscribe({
        next: (r) => {
          this.libre.set(r.libre);
          this.abierto.set(this.calcular());
        },
        error: () => {},
      });
    }
    const id = setInterval(() => this.abierto.set(this.calcular()), 30_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
