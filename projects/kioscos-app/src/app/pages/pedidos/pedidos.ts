import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { KioscosApi, PeriodoHistorial, PesosPipe, cantidadProductos, codigoPedido, movimientoDePedido } from '@freedeli/shared';
import { startWith, switchMap } from 'rxjs';

const PERIODOS: { id: PeriodoHistorial; etiqueta: string }[] = [
  { id: 'hoy', etiqueta: 'HOY' },
  { id: 'semana', etiqueta: 'SEMANA' },
  { id: 'mes', etiqueta: 'MES' },
];
const FECHA = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

@Component({
  selector: 'fd-pedidos',
  imports: [PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="encabezado">
      <h1 class="titulo">PEDIDOS</h1>
      <div class="periodos" role="group" aria-label="Período">
        @for (p of periodos; track p.id) {
          <button type="button" [attr.aria-pressed]="periodo() === p.id" (click)="periodo.set(p.id)">{{ p.etiqueta }}</button>
        }
      </div>
    </div>
    <p class="sutil" aria-live="polite">{{ resumen().entregados }} entregados · {{ resumen().cancelados }} cancelados · {{ resumen().neto | pesos }} neto</p>

    @if (filas(); as fs) {
      @if (fs.length === 0) {
        <p class="sutil">Sin pedidos terminados en este período.</p>
      } @else {
        <div class="tabla-caja">
          <table>
            <thead>
              <tr>
                <th scope="col">Pedido</th><th scope="col">Fecha</th><th scope="col">Cliente</th><th scope="col" class="num">Productos</th>
                <th scope="col">Estado</th><th scope="col" class="num">Cobrado</th><th scope="col" class="num">Neto</th>
              </tr>
            </thead>
            <tbody>
              @for (f of fs; track f.id) {
                <tr [class.cancelado]="f.cancelado">
                  <td>{{ f.codigo }}</td><td>{{ f.fecha }}</td><td>{{ f.cliente }}</td><td class="num">{{ f.cantidad }}</td>
                  <td><span class="chip" [class.ok]="!f.cancelado">{{ f.cancelado ? 'Cancelado' : 'Entregado' }}</span></td>
                  <td class="num">{{ f.cobrado | pesos }}</td><td class="num">{{ f.neto | pesos }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }
    } @else {
      <p class="sutil">Cargando…</p>
    }
  `,
  styles: `
    @use 'kiosco';
    :host { display: flex; flex-direction: column; gap: 16px; }
    .chip { padding: 4px 6px; font-size: 12px; font-weight: 700; background: var(--fd-amber-400); color: var(--fd-navy-900); }
    .chip.ok { background: var(--fd-blue-300); }
    .cancelado td { color: var(--fd-blue-100); }
  `,
})
export default class Pedidos {
  private readonly api = inject(KioscosApi);
  protected readonly periodos = PERIODOS;
  protected readonly periodo = signal<PeriodoHistorial>('hoy');
  private readonly lista = toSignal(toObservable(this.periodo).pipe(switchMap((p) => this.api.historial(p).pipe(startWith(undefined)))));

  protected readonly filas = computed(() =>
    this.lista()?.map((p) => {
      const m = movimientoDePedido(p);
      return {
        id: p.id,
        codigo: codigoPedido(p),
        fecha: FECHA.format(p.creadoEn),
        cliente: p.destino.nombre,
        cantidad: cantidadProductos(p),
        cancelado: p.estado === 'cancelado',
        cobrado: m.totalCliente,
        neto: m.netoKiosco,
      };
    }),
  );

  protected readonly resumen = computed(() => {
    const fs = this.filas() ?? [];
    return {
      entregados: fs.filter((f) => !f.cancelado).length,
      cancelados: fs.filter((f) => f.cancelado).length,
      neto: fs.reduce((a, f) => a + f.neto, 0),
    };
  });
}
