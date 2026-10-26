import { Pipe, PipeTransform } from '@angular/core';

const FORMATO = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 });

/** 1800 → "$1.800" */
export function formatearPesos(monto: number): string {
  return `${monto < 0 ? '-' : ''}$${FORMATO.format(Math.abs(Math.round(monto)))}`;
}

@Pipe({ name: 'pesos' })
export class PesosPipe implements PipeTransform {
  transform(monto: number | null | undefined): string {
    return monto == null ? '' : formatearPesos(monto);
  }
}
