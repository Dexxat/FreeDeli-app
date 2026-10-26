import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminApi, PesosPipe } from '@freedeli/shared';

@Component({
  selector: 'fd-resumen',
  imports: [PesosPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <h1 class="titulo">RESUMEN DE HOY</h1>
    @if (resumen(); as r) {
      <section class="tarjetas" aria-label="Números del día">
        <div class="tarjeta destacada"><span class="sutil">Ganancias FreeDeli</span><span class="valor amarillo">{{ r.comisionesHoy | pesos }}</span></div>
        <div class="tarjeta"><span class="sutil">Pedidos</span><span class="valor">{{ r.pedidosHoy }}</span></div>
        <div class="tarjeta"><span class="sutil">Entregados</span><span class="valor">{{ r.entregadosHoy }}</span></div>
        <div class="tarjeta"><span class="sutil">En curso</span><span class="valor">{{ r.enCurso }}</span></div>
        <div class="tarjeta"><span class="sutil">Kioscos abiertos</span><span class="valor">{{ r.kioscosAbiertos }}</span></div>
        <div class="tarjeta"><span class="sutil">Riders activos</span><span class="valor">{{ r.ridersActivos }}</span></div>
      </section>

      <section class="bloque">
        <h2 class="subtitulo">ALERTAS</h2>
        @if (r.alertas.length === 0) {
          <p class="sutil">Todo en orden.</p>
        } @else {
          <ul class="alertas">
            @for (a of r.alertas; track a.texto) {
              <li>
                <span class="chip alerta">{{ a.tipo === 'saldo-bajo' ? 'SALDO' : 'DEMORA' }}</span>
                <span>{{ a.texto }}</span>
                <a class="enlace" [routerLink]="a.ruta">Ver</a>
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
  styles: `
    @use 'panel';
    :host { display: flex; flex-direction: column; gap: 24px; }
    .tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 12px; }
    .tarjeta { padding: 16px; display: flex; flex-direction: column; gap: 12px; background: #0f1f4a; }
    .destacada { background: var(--fd-navy-700); box-shadow: inset 4px 0 0 var(--fd-yellow-400); }
    .valor { font-family: var(--fd-font-pixel); font-size: 20px; line-height: 1; }
    .amarillo { color: var(--fd-yellow-400); }
    .bloque { display: flex; flex-direction: column; gap: 12px; }
    .alertas { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .alertas li { padding: 12px 14px; display: flex; align-items: center; gap: 12px; background: #0f1f4a; font-size: 14px; }
    .alertas li span:nth-child(2) { flex: 1 1 auto; }
  `,
})
export default class Resumen {
  protected readonly resumen = toSignal(inject(AdminApi).resumen());
}
