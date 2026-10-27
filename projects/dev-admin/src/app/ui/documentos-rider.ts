import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AdminApi, TIPOS_DOCUMENTO, TipoDocumento } from '@freedeli/shared';
import { switchMap } from 'rxjs';

/** Fotos del seguro y la licencia de un rider. Tocar una la amplía. */
@Component({
  selector: 'fd-documentos-rider',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="documentos">
      @for (t of tipos; track t.id) {
        <figure [class.ampliada]="ampliada() === t.id">
          @if (documentos()?.[t.id]; as foto) {
            <button type="button" (click)="alternar(t.id)" [attr.aria-label]="(ampliada() === t.id ? 'Achicar ' : 'Ampliar ') + t.nombre">
              <img [src]="foto" [alt]="t.nombre" />
            </button>
          } @else {
            <span class="falta">{{ documentos() ? 'Sin cargar' : 'Cargando…' }}</span>
          }
          <figcaption>{{ t.nombre }}</figcaption>
        </figure>
      }
    </div>
  `,
  styles: `
    .documentos { display: flex; flex-wrap: wrap; gap: 12px; }
    figure { margin: 0; width: 160px; display: flex; flex-direction: column; gap: 4px; }
    figure.ampliada { width: 100%; max-width: 640px; }
    button { padding: 0; border: none; background: var(--fd-navy-900); cursor: zoom-in; }
    figure.ampliada button { cursor: zoom-out; }
    button:focus-visible { outline: 3px solid var(--fd-yellow-400); outline-offset: 2px; }
    img { display: block; width: 100%; height: auto; max-height: 120px; object-fit: contain; }
    figure.ampliada img { max-height: 70vh; }
    .falta { min-height: 80px; display: flex; align-items: center; justify-content: center; background: var(--fd-navy-900); font-size: 12px; color: var(--fd-amber-400); }
    figcaption { font-size: 12px; color: var(--fd-blue-100); }
  `,
})
export class DocumentosRider {
  readonly riderId = input.required<string>();
  protected readonly tipos = TIPOS_DOCUMENTO;
  private readonly api = inject(AdminApi);
  protected readonly documentos = toSignal(toObservable(this.riderId).pipe(switchMap((id) => this.api.documentosRider(id))));
  protected readonly ampliada = signal<TipoDocumento | null>(null);

  protected alternar(tipo: TipoDocumento): void {
    this.ampliada.update((actual) => (actual === tipo ? null : tipo));
  }
}
