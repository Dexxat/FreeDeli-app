import { ChangeDetectionStrategy, Component, ElementRef, computed, input, model, viewChildren } from '@angular/core';

/** Cuatro casillas para el PIN del cliente. Avanza solo, acepta pegar y borra hacia atrás. */
@Component({
  selector: 'fd-pin-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="casillas">
      @for (i of indices; track i) {
        <input
          #casilla
          type="text"
          inputmode="numeric"
          autocomplete="one-time-code"
          maxlength="1"
          [attr.aria-label]="'Dígito ' + (i + 1) + ' del PIN'"
          [attr.aria-invalid]="invalido()"
          [disabled]="deshabilitado()"
          [value]="digitos()[i]"
          (input)="alEscribir(i, $event)"
          (keydown)="alTeclear(i, $event)"
          (paste)="alPegar($event)"
          (focus)="seleccionar($event)"
        />
      }
    </div>
  `,
  styles: `
    .casillas { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
    input {
      min-width: 0; height: 56px;
      border: none; border-radius: 0;
      background: var(--fd-navy-700); color: var(--fd-yellow-400);
      text-align: center;
      font-family: var(--fd-font-pixel); font-size: 22px;
      caret-color: var(--fd-yellow-400);
    }
    input:focus-visible { outline: 4px solid var(--fd-yellow-400); outline-offset: 0; }
    input[aria-invalid='true'] { outline: 4px solid var(--fd-amber-400); }
    input:disabled { opacity: 0.6; }
  `,
})
export class PinInput {
  readonly valor = model('');
  readonly invalido = input(false);
  readonly deshabilitado = input(false);

  protected readonly indices = [0, 1, 2, 3];
  protected readonly digitos = computed(() => this.indices.map((i) => this.valor()[i] ?? ''));
  private readonly casillas = viewChildren<ElementRef<HTMLInputElement>>('casilla');

  /** Vacía el PIN y pone el foco en la primera casilla. */
  limpiar(): void {
    this.valor.set('');
    queueMicrotask(() => this.casillas()[0]?.nativeElement.focus());
  }

  private escribir(i: number, digito: string): void {
    const d = [...this.digitos()];
    d[i] = digito;
    // El valor se corta en el primer hueco, así siempre es un prefijo continuo.
    const hueco = d.indexOf('');
    this.valor.set((hueco === -1 ? d : d.slice(0, hueco)).join(''));
  }

  protected alEscribir(i: number, e: Event): void {
    const campo = e.target as HTMLInputElement;
    const digito = campo.value.replace(/\D/g, '').slice(-1);
    campo.value = digito;
    if (!digito) return;
    this.escribir(Math.min(i, this.valor().length), digito);
    this.casillas()[Math.min(this.valor().length, 3)]?.nativeElement.focus();
  }

  protected alTeclear(i: number, e: KeyboardEvent): void {
    if (e.key === 'Backspace' && !this.digitos()[i] && i > 0) {
      e.preventDefault();
      this.valor.set(this.valor().slice(0, i - 1));
      this.casillas()[i - 1].nativeElement.focus();
    } else if (e.key === 'Backspace') {
      this.valor.set(this.valor().slice(0, i));
    }
  }

  protected alPegar(e: ClipboardEvent): void {
    const pegado = (e.clipboardData?.getData('text') ?? '').replace(/\D/g, '').slice(0, 4);
    if (!pegado) return;
    e.preventDefault();
    this.valor.set(pegado);
    this.casillas()[Math.min(pegado.length, 3)]?.nativeElement.focus();
  }

  protected seleccionar(e: FocusEvent): void {
    (e.target as HTMLInputElement).select();
  }
}
