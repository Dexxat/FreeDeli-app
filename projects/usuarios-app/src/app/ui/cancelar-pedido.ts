import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { CANCELACIONES_PARA_PAUSA, Pedido, UsuariosApi, formatearPesos, mensajeDeError, reintegroAlCancelar } from '@freedeli/shared';
import { UsuarioStore } from '../core/usuario.store';

/** "Cancelar pedido": en cualquier momento antes de la entrega, avisando cuánto se le devuelve. */
@Component({
  selector: 'fd-cancelar-pedido',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (error(); as e) { <p class="error" role="alert">{{ e }}</p> }
    <button type="button" [disabled]="enviando()" (click)="cancelar()">Cancelar pedido</button>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 6px; }
    button { align-self: flex-start; min-height: 44px; border: none; background: none; cursor: pointer; font: inherit; color: var(--fd-blue-300); font-size: 14px; font-weight: 600; text-decoration: underline; }
    button:disabled { opacity: 0.6; cursor: progress; }
    button:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: 2px; }
    .error { margin: 0; font-size: 13px; font-weight: 700; color: var(--fd-amber-400); }
  `,
})
export class CancelarPedido {
  private readonly api = inject(UsuariosApi);
  private readonly store = inject(UsuarioStore);
  readonly pedido = input.required<Pedido>();
  /** El cliente ya esperó 10 minutos sin rider: cancelar no le cuenta en contra. */
  readonly sinRider = input(false);

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  private readonly confirmacion = computed(() => {
    const reintegro = reintegroAlCancelar(this.pedido(), false);
    const dinero = reintegro ? `El kiosco te devuelve ${formatearPesos(reintegro)} por transferencia.` : 'No se te cobró nada.';
    const advertencia = this.sinRider() ? '' : `\nSi cancelás ${CANCELACIONES_PARA_PAUSA} pedidos en una semana, tu cuenta se pausa.`;
    return `¿Cancelar el pedido? ${dinero}${advertencia}`;
  });

  protected cancelar(): void {
    if (!confirm(this.confirmacion())) return;
    this.enviando.set(true);
    this.error.set(null);
    this.api.cancelarPedido(this.pedido().id).subscribe({
      next: () => {
        this.enviando.set(false);
        this.store.recargarPerfil();
      },
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e, e instanceof Error ? e.message : undefined));
      },
    });
  }
}
