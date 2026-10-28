import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { AdminApi, AlertaAdmin, PesosPipe, ZonaId, codigoPedido, codigoRider, nombreZona } from '@freedeli/shared';
import { Incidente } from '../../ui/incidente';
import { switchMap } from 'rxjs';
import { PanelAltas } from '../../ui/altas';
import { SelectorZonas, zonasDeUrl } from '../../ui/zonas';

export const TEXTO_ESTADO: Record<string, string> = {
  esperando: 'Esperando rider',
  aceptado: 'Aceptado',
  retirado: 'Retirado',
  'en-camino': 'En camino',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ETIQUETA_ALERTA: Record<AlertaAdmin['tipo'], string> = {
  'saldo-bajo': 'SALDO',
  'pedido-demorado': 'DEMORA',
  'cliente-pausado': 'CLIENTE',
  'rider-pausado': 'RIDER',
};

@Component({
  selector: 'fd-main',
  imports: [PesosPipe, RouterLink, SelectorZonas, PanelAltas, Incidente],
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
  protected readonly codigoRider = codigoRider;
  protected readonly zona = nombreZona;
  protected readonly textoEstado = TEXTO_ESTADO;
  protected readonly etiquetaAlerta = ETIQUETA_ALERTA;
  protected readonly reactivando = signal(false);

  /** Reactiva a un cliente pausado por cancelaciones, después de hablarlo por WhatsApp. */
  protected reactivar(usuarioId: string): void {
    this.reactivando.set(true);
    this.api.reactivarUsuario(usuarioId).subscribe({ next: () => this.reactivando.set(false), error: () => this.reactivando.set(false) });
  }

  protected cambiarZonas(zonas: ZonaId[]): void {
    const todas = zonas.length === 3;
    void this.router.navigate([], { queryParams: { zonas: todas ? null : zonas.join(',') }, replaceUrl: true });
  }
}
