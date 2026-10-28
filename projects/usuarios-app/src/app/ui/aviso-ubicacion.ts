import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { UbicacionCliente } from '../core/ubicacion';

/** Cartel cuando no hay ubicación: sin GPS no se puede pedir. */
@Component({
  selector: 'fd-aviso-ubicacion',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @let e = ubicacion.estado();
    @if (e.tipo === 'error') {
      <div class="aviso" role="alert">
        @if (e.motivo === 'sin-permiso') {
          <strong>ACTIVÁ TU UBICACIÓN</strong>
          <span>FreeDeli entrega donde estás. Permití la ubicación para este sitio en la configuración del navegador y tocá REINTENTAR.</span>
        } @else {
          <strong>NO ENCONTRAMOS TU UBICACIÓN</strong>
          <span>FreeDeli entrega donde estás. Revisá que el GPS del celular esté prendido y tocá REINTENTAR.</span>
        }
        <button type="button" (click)="ubicacion.actualizar()">REINTENTAR</button>
      </div>
    }
  `,
  styles: `
    .aviso { padding: 12px; display: flex; flex-direction: column; gap: 6px; background: var(--fd-amber-400); color: var(--fd-navy-900); font-size: 13px; line-height: 1.4; }
    strong { font-family: var(--fd-font-pixel); font-size: 10px; }
    button { align-self: flex-start; min-height: 44px; padding: 0 14px; border: none; cursor: pointer; background: var(--fd-navy-900); color: #fff; font-family: var(--fd-font-pixel); font-size: 9px; }
    button:focus-visible { outline: 3px solid var(--fd-navy-900); outline-offset: 2px; }
  `,
})
export class AvisoUbicacion {
  protected readonly ubicacion = inject(UbicacionCliente);
}
