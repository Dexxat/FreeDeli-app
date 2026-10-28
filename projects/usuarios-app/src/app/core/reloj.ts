import { DestroyRef, Injectable, inject, signal } from '@angular/core';

/** La hora actual, al día cada 15 segundos: para tiempos de llegada y esperas. */
@Injectable({ providedIn: 'root' })
export class Reloj {
  readonly ahora = signal(new Date());

  constructor() {
    const id = setInterval(() => this.ahora.set(new Date()), 15_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }
}
