import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { AdminApi, EstadoPedido, ESTADOS_ABIERTOS, Pedido, mensajeDeError } from '@freedeli/shared';
import { Observable } from 'rxjs';

/**
 * Herramientas para destrabar un pedido abierto. Lo que pasó se habla antes por WhatsApp:
 * - Entregado sin PIN: el rider lo entregó pero el cliente no pudo darle el PIN.
 * - El rider no fue: reintegro total, y le cuenta como abandono al rider.
 * - Cancelar: reintegro total por cualquier otro motivo.
 */
@Component({
  selector: 'fd-incidente',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (abierto()) {
      <div class="acciones">
        @if (puedeEntregar()) {
          <button type="button" class="boton" [disabled]="enviando()" (click)="entregar()">Entregado sin PIN</button>
        }
        @if (conRider()) {
          <button type="button" class="boton peligro" [disabled]="enviando()" (click)="cancelar('rider')">El rider no fue</button>
        }
        <button type="button" class="boton peligro" [disabled]="enviando()" (click)="cancelar('dev')">Cancelar</button>
      </div>
      @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 6px; }
    .acciones { display: flex; flex-wrap: wrap; gap: 6px; }
    .boton {
      min-height: 32px; padding: 0 10px; border: none; cursor: pointer;
      background: var(--fd-navy-700); color: #fff; font: inherit; font-size: 12px; font-weight: 600;
      &.peligro { background: var(--fd-amber-400); color: var(--fd-navy-900); }
      &:disabled { opacity: 0.6; cursor: progress; }
      &:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: 2px; }
    }
    .error { margin: 0; font-size: 12px; font-weight: 700; color: var(--fd-amber-400); }
  `,
})
export class Incidente {
  private readonly api = inject(AdminApi);
  readonly pedidoId = input.required<string>();
  readonly numero = input.required<number>();
  readonly estado = input.required<EstadoPedido>();
  readonly riderId = input<string | undefined>();

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly abierto = computed(() => ESTADOS_ABIERTOS.includes(this.estado()));
  protected readonly puedeEntregar = computed(() => this.estado() === 'retirado' || this.estado() === 'en-camino');
  /** El kiosco ya aprobó al rider. */
  protected readonly conRider = computed(() => !!this.riderId() && this.estado() !== 'esperando');

  protected entregar(): void {
    if (confirm(`¿Marcar #A-${this.numero()} como entregado? Se liquida como cualquier entrega.`)) this.hacer(this.api.entregarPedido(this.pedidoId()));
  }

  protected cancelar(motivo: 'rider' | 'dev'): void {
    const porque = motivo === 'rider' ? ' porque el rider no fue (le cuenta como abandono)' : '';
    if (confirm(`¿Cancelar #A-${this.numero()}${porque}? Si el cliente pagó, el kiosco le devuelve todo.`)) this.hacer(this.api.cancelarPedido(this.pedidoId(), motivo));
  }

  private hacer(llamada: Observable<Pedido>): void {
    this.enviando.set(true);
    this.error.set(null);
    llamada.subscribe({
      next: () => this.enviando.set(false),
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e, e instanceof Error ? e.message : undefined));
      },
    });
  }
}
