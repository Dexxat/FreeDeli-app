import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { KioscosApi, Pedido, PesosPipe, SALDO_BAJO, quienDebeActuar } from '@freedeli/shared';
import { Sonido } from '../../core/sonido';
import { TarjetaPedido } from '../../ui/tarjeta-pedido';

/** Columnas del tablero en vivo. */
export function agruparEnVivo(pedidos: readonly Pedido[]) {
  const accion: Pedido[] = [];
  const esperando: Pedido[] = [];
  const enCamino: Pedido[] = [];
  for (const p of pedidos) {
    const quien = quienDebeActuar(p);
    if (p.estado === 'retirado' || p.estado === 'en-camino') enCamino.push(p);
    else if (quien === 'kiosco' || quien === 'kiosco-y-rider') accion.push(p);
    else esperando.push(p);
  }
  return { accion, esperando, enCamino };
}

@Component({
  selector: 'fd-inicio',
  imports: [TarjetaPedido, PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (kiosco(); as k) {
      <header class="cabecera">
        <div>
          <h1 class="titulo">{{ k.nombre }}</h1>
          <p class="sutil">En vivo · {{ pedidos().length }} {{ pedidos().length === 1 ? "pedido abierto" : "pedidos abiertos" }}</p>
        </div>
        <div class="saldo" [class.bajo]="k.saldo < saldoBajo">
          <span class="sutil">Saldo prepago</span>
          <span class="saldo-valor">{{ k.saldo | pesos }}</span>
          @if (k.saldo < saldoBajo) { <span class="aviso">Cargá saldo para no quedarte sin pedidos</span> }
        </div>
      </header>
    }

    <div class="tablero">
      <section class="columna" aria-labelledby="col-accion">
        <h2 id="col-accion" class="subtitulo amarillo">TU TURNO · {{ grupos().accion.length }}</h2>
        @for (p of grupos().accion; track p.id) {
          <fd-tarjeta-pedido [pedido]="p" [accion]="true" />
        } @empty {
          <p class="vacio">Nada pendiente. Los pedidos nuevos aparecen acá.</p>
        }
      </section>
      <section class="columna" aria-labelledby="col-esperando">
        <h2 id="col-esperando" class="subtitulo">ESPERANDO · {{ grupos().esperando.length }}</h2>
        @for (p of grupos().esperando; track p.id) {
          <fd-tarjeta-pedido [pedido]="p" />
        } @empty {
          <p class="vacio">Sin pedidos esperando al cliente o a un rider.</p>
        }
      </section>
      <section class="columna" aria-labelledby="col-camino">
        <h2 id="col-camino" class="subtitulo">EN CAMINO · {{ grupos().enCamino.length }}</h2>
        @for (p of grupos().enCamino; track p.id) {
          <fd-tarjeta-pedido [pedido]="p" />
        } @empty {
          <p class="vacio">Ningún pedido en camino.</p>
        }
      </section>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 20px; }
    .cabecera { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 16px; }
    .titulo { margin: 0 0 6px; font-family: var(--fd-font-pixel); font-size: 15px; line-height: 1.4; }
    .subtitulo { margin: 0; font-family: var(--fd-font-pixel); font-size: 10px; color: var(--fd-blue-100); }
    .amarillo { color: var(--fd-yellow-400); }
    .sutil { margin: 0; font-size: 13px; color: var(--fd-blue-100); }
    .saldo { padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; background: #0f1f4a; }
    .saldo.bajo { box-shadow: inset 4px 0 0 var(--fd-amber-400); }
    .saldo-valor { font-family: var(--fd-font-pixel); font-size: 16px; }
    .aviso { font-size: 12px; font-weight: 700; color: var(--fd-amber-400); }
    .tablero { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: start; }
    .columna { display: flex; flex-direction: column; gap: 10px; }
    .vacio { margin: 0; padding: 14px; background: #0f1f4a; font-size: 14px; color: var(--fd-blue-100); }
    @media (max-width: 1000px) { .tablero { grid-template-columns: minmax(0, 1fr); } }
  `,
})
export default class Inicio {
  private readonly api = inject(KioscosApi);
  private readonly sonido = inject(Sonido);

  protected readonly kiosco = toSignal(this.api.kiosco());
  protected readonly pedidos = toSignal(this.api.pedidosEnVivo(), { initialValue: [] as Pedido[] });
  protected readonly grupos = computed(() => agruparEnVivo(this.pedidos()));
  protected readonly saldoBajo = SALDO_BAJO;

  constructor() {
    // Suena cuando llega un pedido nuevo para confirmar stock.
    let conocidos: Set<string> | null = null;
    effect(() => {
      const nuevos = this.pedidos().filter((p) => p.estado === 'esperando' && p.fase === 'stock').map((p) => p.id);
      if (conocidos && nuevos.some((id) => !conocidos!.has(id))) this.sonido.pedidoNuevo();
      conocidos = new Set(this.pedidos().map((p) => p.id));
    });
  }
}
