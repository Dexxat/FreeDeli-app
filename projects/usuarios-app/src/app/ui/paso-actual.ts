import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Pedido, PesosPipe, UsuariosApi, totalPedido } from '@freedeli/shared';

/**
 * Qué está pasando con el pedido antes de que el rider lo retire, y qué tiene que hacer el cliente.
 * Solo se muestra mientras el pedido espera (fases stock, ajuste, transferencia, rider y aprobación).
 */
@Component({
  selector: 'fd-paso-actual',
  imports: [PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let p = pedido();
    @if (p.estado === 'esperando') {
      <section class="paso" [class.accion]="p.fase === 'ajuste' || p.fase === 'transferencia'" aria-live="polite">
        @switch (p.fase) {
          @case ('stock') {
            <h2 class="titulo">REVISANDO STOCK</h2>
            <p class="texto">El kiosco está revisando que tenga todo. Después te pedimos la transferencia.</p>
          }
          @case ('ajuste') {
            <h2 class="titulo">FALTAN PRODUCTOS</h2>
            <p class="texto">Al kiosco no le quedan:</p>
            <ul class="lista">
              @for (i of p.itemsQuitados ?? []; track i.productoId) {
                <li><span>{{ i.cantidad }} × {{ i.nombre }}</span><span class="tachado">{{ i.cantidad * i.precioUnitario | pesos }}</span></li>
              }
            </ul>
            <p class="texto">Nuevo total: <strong>{{ total() | pesos }}</strong></p>
            @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
            <div class="botones">
              <button type="button" class="secundario" [disabled]="enviando()" (click)="cancelar()">Cancelar pedido</button>
              <button type="button" class="primario" [disabled]="enviando()" (click)="aceptar()">ACEPTAR</button>
            </div>
          }
          @case ('transferencia') {
            <h2 class="titulo">PAGO POR TRANSFERENCIA</h2>
            <p class="texto">Transferí <strong>{{ total() | pesos }}</strong> al alias del kiosco:</p>
            <div class="alias">
              <span class="alias-valor">{{ p.aliasKiosco }}</span>
              <button type="button" (click)="copiar(p.aliasKiosco)">{{ copiado() ? 'COPIADO' : 'COPIAR' }}</button>
            </div>
            <p class="sutil">Cuando el kiosco confirme que la recibió, buscamos rider. El kiosco retiene el pago hasta que le des tu PIN al rider.</p>
            @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
            <button type="button" class="enlace" [disabled]="enviando()" (click)="cancelar()">Cancelar pedido</button>
          }
          @case ('rider') {
            <h2 class="titulo">BUSCANDO RIDER</h2>
            <p class="texto">El kiosco confirmó tu transferencia. Le avisamos a los riders de la zona.</p>
          }
          @case ('aprobacion') {
            <h2 class="titulo">RIDER ENCONTRADO</h2>
            <p class="texto">Un rider aceptó tu pedido y el kiosco lo está confirmando.</p>
          }
        }
      </section>
    }
  `,
  styles: `
    .paso { padding: 14px; display: flex; flex-direction: column; gap: 10px; background: #0f1f4a; border-left: 4px solid var(--fd-blue-300); }
    .accion { border-left-color: var(--fd-yellow-400); }
    .titulo { margin: 0; font-family: var(--fd-font-pixel); font-size: 10px; color: var(--fd-yellow-400); }
    .texto { margin: 0; font-size: 15px; line-height: 1.4; }
    .sutil { margin: 0; font-size: 13px; color: var(--fd-blue-100); }
    .lista { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
    .lista li { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; }
    .tachado { text-decoration: line-through; color: var(--fd-blue-100); }
    .error { margin: 0; font-size: 13px; font-weight: 700; color: var(--fd-amber-400); }
    button { border: none; cursor: pointer; font: inherit; }
    button:disabled { opacity: 0.6; cursor: progress; }
    button:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: 2px; }
    .botones { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .secundario { min-height: 48px; background: var(--fd-navy-700); color: #fff; font-weight: 600; }
    .primario { min-height: 48px; background: var(--fd-yellow-400); color: var(--fd-navy-900); font-family: var(--fd-font-pixel); font-size: 11px; }
    .enlace { align-self: flex-start; min-height: 44px; background: none; color: var(--fd-blue-300); font-size: 14px; font-weight: 600; text-decoration: underline; }
    .alias {
      display: flex; align-items: center; justify-content: space-between; gap: 10px;
      padding: 8px 8px 8px 12px;
      background: var(--fd-blue-50); color: var(--fd-navy-900);
      button { min-height: 44px; padding: 0 12px; background: var(--fd-navy-700); color: #fff; font-family: var(--fd-font-pixel); font-size: 9px; }
    }
    .alias-valor { font-size: 16px; font-weight: 700; overflow-wrap: anywhere; }
  `,
})
export class PasoActual {
  private readonly api = inject(UsuariosApi);
  readonly pedido = input.required<Pedido>();

  protected readonly total = computed(() => totalPedido(this.pedido()));
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly copiado = signal(false);

  private hacer(accion: 'aceptarAjuste' | 'cancelarPedido'): void {
    this.enviando.set(true);
    this.error.set(null);
    this.api[accion](this.pedido().id).subscribe({
      next: () => this.enviando.set(false),
      error: (e: Error) => {
        this.enviando.set(false);
        this.error.set(e.message);
      },
    });
  }

  protected aceptar(): void {
    this.hacer('aceptarAjuste');
  }

  protected cancelar(): void {
    if (confirm('¿Cancelar el pedido?')) this.hacer('cancelarPedido');
  }

  protected async copiar(alias: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(alias);
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2500);
    } catch {
      this.copiado.set(false);
    }
  }
}
