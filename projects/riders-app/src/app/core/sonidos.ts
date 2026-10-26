import { Injectable, inject } from '@angular/core';
import { RiderStore } from './rider.store';

/** Sonidos 8 bit cortos con onda cuadrada. Respetan la preferencia del rider. */
@Injectable({ providedIn: 'root' })
export class Sonidos {
  private readonly store = inject(RiderStore);
  private ctx?: AudioContext;

  private tocar(notas: { frecuencia: number; duracion: number }[]): void {
    if (!this.store.rider()?.preferencias.sonidos8bit || typeof AudioContext === 'undefined') return;
    this.ctx ??= new AudioContext();
    let t = this.ctx.currentTime;
    for (const n of notas) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = n.frecuencia;
      gain.gain.value = 0.06;
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + n.duracion);
      t += n.duracion;
    }
  }

  /** "PRESS START": arpegio ascendente. */
  start(): void {
    this.tocar([
      { frecuencia: 523, duracion: 0.07 },
      { frecuencia: 659, duracion: 0.07 },
      { frecuencia: 784, duracion: 0.07 },
      { frecuencia: 1047, duracion: 0.12 },
    ]);
  }

  /** Apagado: dos notas descendentes. */
  off(): void {
    this.tocar([
      { frecuencia: 392, duracion: 0.08 },
      { frecuencia: 262, duracion: 0.12 },
    ]);
  }

  /** Pedido nuevo: tres notas agudas, como un "item encontrado". */
  pedidoNuevo(): void {
    this.tocar([
      { frecuencia: 988, duracion: 0.08 },
      { frecuencia: 1319, duracion: 0.08 },
      { frecuencia: 1976, duracion: 0.16 },
    ]);
  }

  click(): void {
    this.tocar([{ frecuencia: 880, duracion: 0.04 }]);
  }

  error(): void {
    this.tocar([{ frecuencia: 150, duracion: 0.15 }]);
  }
}
