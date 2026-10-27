import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { KioscosApi, PeriodoAdmin, PesosPipe, formatearPesos } from '@freedeli/shared';
import { startWith, switchMap } from 'rxjs';

const PERIODOS: { id: PeriodoAdmin; etiqueta: string; leyenda: string }[] = [
  { id: 'jornada', etiqueta: 'JORNADA', leyenda: 'Neto de la jornada de hoy' },
  { id: 'semana', etiqueta: 'SEMANA', leyenda: 'Neto de los últimos 7 días' },
  { id: 'mes', etiqueta: 'MES', leyenda: 'Neto de este mes' },
];

@Component({
  selector: 'fd-ganancias',
  imports: [PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="encabezado">
      <h1 class="titulo">GANANCIAS</h1>
      <div class="periodos" role="group" aria-label="Período">
        @for (p of periodos; track p.id) {
          <button type="button" [attr.aria-pressed]="periodo() === p.id" (click)="periodo.set(p.id)">{{ p.etiqueta }}</button>
        }
      </div>
    </div>

    @if (datos(); as g) {
      <section class="total" aria-live="polite">
        <span class="sutil">{{ leyenda() }}</span>
        <span class="total-monto">{{ g.neto | pesos }}</span>
        <span class="sutil">{{ g.pedidos }} {{ g.pedidos === 1 ? 'pedido entregado' : 'pedidos entregados' }}</span>
      </section>

      <section class="desglose" aria-label="Desglose">
        <div><span>Cobrado a clientes</span><strong>{{ g.cobrado | pesos }}</strong></div>
        <div><span>Envíos pagados a riders</span><strong>−{{ g.envios | pesos }}</strong></div>
        <div><span>Comisiones FreeDeli (del saldo)</span><strong>−{{ g.comisiones | pesos }}</strong></div>
        @if (g.premios) {
          <div><span>Saldo a favor de clientes (lo pone FreeDeli)</span><strong>+{{ g.premios | pesos }}</strong></div>
        }
        <div class="final"><strong>Neto</strong><strong class="amarillo">{{ g.neto | pesos }}</strong></div>
      </section>

      <section class="bloque">
        <h2 class="subtitulo">{{ periodo() === 'jornada' ? 'POR HORA' : 'POR DÍA' }}</h2>
        <div class="grafico" role="img" [attr.aria-label]="'Neto ' + descripcion()">
          @for (b of barras(); track $index) {
            <div class="columna">
              <span class="barra" [class.vacia]="b.monto === 0" [style.height]="b.alto"></span>
              <span class="etiqueta">{{ b.etiqueta }}</span>
            </div>
          }
        </div>
      </section>
    } @else {
      <p class="sutil">Cargando…</p>
    }
  `,
  styles: `
    @use 'kiosco';
    @use 'pixel';
    :host { display: flex; flex-direction: column; gap: 20px; }
    .total { margin: 4px; padding: 20px; display: flex; flex-direction: column; gap: 10px; background: var(--fd-navy-700); @include pixel.borde(var(--fd-blue-500)); }
    .total-monto { font-family: var(--fd-font-pixel); font-size: 30px; line-height: 1; color: var(--fd-yellow-400); }
    .desglose { display: flex; flex-direction: column; gap: 2px; }
    .desglose div { display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; background: #0f1f4a; font-size: 15px; }
    .desglose .final { background: var(--fd-navy-900); }
    .amarillo { color: var(--fd-yellow-400); }
    .bloque { display: flex; flex-direction: column; gap: 10px; }
    .grafico { height: 180px; padding: 12px 10px 0; display: flex; align-items: flex-end; gap: 4px; background: #0f1f4a; overflow-x: auto; }
    .columna { flex: 1 0 18px; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; align-items: center; gap: 6px; }
    .barra { width: 100%; background: var(--fd-yellow-400); }
    .barra.vacia { background: var(--fd-navy-700); }
    .etiqueta { padding-bottom: 8px; font-size: 10px; color: var(--fd-blue-100); }
  `,
})
export default class Ganancias {
  private readonly api = inject(KioscosApi);
  protected readonly periodos = PERIODOS;
  protected readonly periodo = signal<PeriodoAdmin>('jornada');
  protected readonly datos = toSignal(toObservable(this.periodo).pipe(switchMap((p) => this.api.ganancias(p).pipe(startWith(undefined)))));
  protected readonly leyenda = computed(() => PERIODOS.find((p) => p.id === this.periodo())!.leyenda);
  protected readonly barras = computed(() => {
    const bs = this.datos()?.barras ?? [];
    const max = Math.max(1, ...bs.map((b) => b.monto));
    return bs.map((b) => ({ ...b, alto: `${Math.max(2, Math.round((b.monto / max) * 100))}%` }));
  });
  protected readonly descripcion = computed(() => (this.datos()?.barras ?? []).map((b) => `${b.etiqueta}: ${formatearPesos(b.monto)}`).join(', '));
}
