import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AdminApi, PesosPipe, ZonaId, codigoPedido, nombreZona } from '@freedeli/shared';
import { switchMap } from 'rxjs';
import { SelectorZonas, zonasDeUrl } from '../../ui/zonas';

export const TEXTO_ESTADO: Record<string, string> = {
  esperando: 'Esperando rider',
  aceptado: 'Aceptado',
  retirado: 'Retirado',
  'en-camino': 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

@Component({
  selector: 'fd-main',
  imports: [PesosPipe, RouterLink, SelectorZonas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export default class Main {
  private readonly api = inject(AdminApi);
  private readonly router = inject(Router);

  /** Zonas elegidas, en la URL: ?zonas=san-miguel,muniz */
  readonly zonas = input<string | undefined>(undefined);
  protected readonly elegidas = computed(() => zonasDeUrl(this.zonas()));

  protected readonly filas = toSignal(toObservable(this.elegidas).pipe(switchMap((z) => this.api.pedidosJornada(z))));
  protected readonly resumen = toSignal(this.api.resumen());

  protected readonly totales = computed(() => {
    const fs = this.filas() ?? [];
    return {
      pedidos: fs.length,
      entregados: fs.filter((f) => f.estado === 'entregado').length,
      enCurso: fs.filter((f) => !['entregado', 'cancelado'].includes(f.estado)).length,
    };
  });

  protected readonly codigo = (numero: number) => codigoPedido({ numero });
  protected readonly zona = nombreZona;
  protected readonly textoEstado = TEXTO_ESTADO;

  protected cambiarZonas(zonas: ZonaId[]): void {
    const todas = zonas.length === 3;
    void this.router.navigate([], { queryParams: { zonas: todas ? null : zonas.join(',') }, replaceUrl: true });
  }
}
