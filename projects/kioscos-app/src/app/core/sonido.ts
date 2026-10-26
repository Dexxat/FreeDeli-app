import { Injectable } from '@angular/core';

/** Aviso sonoro 8 bit cuando llega un pedido nuevo. */
@Injectable({ providedIn: 'root' })
export class Sonido {
  private ctx?: AudioContext;

  pedidoNuevo(): void {
    if (typeof AudioContext === 'undefined') return;
    this.ctx ??= new AudioContext();
    let t = this.ctx.currentTime;
    for (const f of [784, 988, 1319]) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.value = f;
      gain.gain.value = 0.06;
      osc.connect(gain).connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.09);
      t += 0.09;
    }
  }
}
