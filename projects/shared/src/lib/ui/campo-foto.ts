import { ChangeDetectionStrategy, Component, input, model, signal } from '@angular/core';
import { imagenValida } from '../rules/documentos.rules';

/**
 * Reduce la foto a un máximo de `ladoMaximo` px y la pasa a JPEG, para que suba rápido
 * con datos móviles. Respeta la orientación de la cámara.
 */
export async function comprimirFoto(archivo: File, ladoMaximo = 1600, calidad = 0.8): Promise<string> {
  if (!archivo.type.startsWith('image/')) throw new Error('Elegí una foto.');
  const imagen = await createImageBitmap(archivo);
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
  const lienzo = document.createElement('canvas');
  lienzo.width = Math.round(imagen.width * escala);
  lienzo.height = Math.round(imagen.height * escala);
  lienzo.getContext('2d')!.drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
  imagen.close();
  const dataUrl = lienzo.toDataURL('image/jpeg', calidad);
  if (!imagenValida(dataUrl)) throw new Error('La foto es demasiado grande. Probá con otra.');
  return dataUrl;
}

/** Elegir o sacar una foto, con vista previa. El valor es la foto comprimida como data URL. */
@Component({
  selector: 'fd-campo-foto',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="campo-foto">
      <span class="etiqueta">{{ etiqueta() }}</span>
      @if (valor(); as foto) {
        <img class="vista" [src]="foto" [alt]="'Foto: ' + etiqueta()" />
      }
      <label class="boton" [class.procesando]="procesando()">
        {{ procesando() ? 'PROCESANDO…' : valor() ? 'CAMBIAR FOTO' : 'SUBIR FOTO' }}
        <input class="oculto" type="file" accept="image/*" [attr.aria-label]="'Foto: ' + etiqueta()" [disabled]="procesando()" (change)="elegir($event)" />
      </label>
      @if (error(); as e) { <span class="error" role="alert">{{ e }}</span> }
    </div>
  `,
  styles: `
    .campo-foto { display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: var(--fd-blue-100); }
    .vista { width: 100%; max-height: 220px; object-fit: contain; background: var(--fd-navy-900); }
    .boton {
      min-height: 48px; display: flex; align-items: center; justify-content: center;
      background: var(--fd-navy-700); color: #fff; cursor: pointer;
      font-family: var(--fd-font-pixel); font-size: 9px;
    }
    .boton:focus-within { outline: 3px solid var(--fd-yellow-400); outline-offset: 2px; }
    .procesando { opacity: 0.6; cursor: progress; }
    .oculto { position: absolute; width: 1px; height: 1px; opacity: 0; overflow: hidden; }
    .error { font-weight: 700; color: var(--fd-amber-400); }
  `,
})
export class CampoFoto {
  readonly etiqueta = input.required<string>();
  readonly valor = model<string | null>(null);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected async elegir(evento: Event): Promise<void> {
    const campo = evento.target as HTMLInputElement;
    const archivo = campo.files?.[0];
    campo.value = '';
    if (!archivo) return;
    this.procesando.set(true);
    this.error.set(null);
    try {
      this.valor.set(await comprimirFoto(archivo));
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'No pudimos leer la foto. Probá con otra.');
    } finally {
      this.procesando.set(false);
    }
  }
}
