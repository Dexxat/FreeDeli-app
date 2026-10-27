import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminApi, BarraEstado, PeriodoAdmin, PesosPipe, codigoPedido, codigoRider, nombreZona } from '@freedeli/shared';
import { combineLatest, startWith, switchMap } from 'rxjs';
import { SelectorPeriodo } from '../../ui/zonas';
import { TEXTO_ESTADO } from '../main/main';
import { DocumentosRider } from '../../ui/documentos-rider';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

@Component({
  selector: 'fd-rider',
  imports: [PesosPipe, RouterLink, BarraEstado, SelectorPeriodo, DocumentosRider],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rider.html',
  styleUrl: './rider.scss',
})
export default class Rider {
  private readonly api = inject(AdminApi);
  readonly riderId = input.required<string>();

  protected readonly periodo = signal<PeriodoAdmin>('jornada');
  protected readonly enviando = signal(false);

  private readonly id$ = toObservable(this.riderId);
  protected readonly rider = toSignal(this.id$.pipe(switchMap((id) => this.api.rider(id))));
  protected readonly envios = toSignal(
    combineLatest([this.id$, toObservable(this.periodo), toObservable(this.rider)]).pipe(
      switchMap(([id, p]) => this.api.enviosRider(id, p).pipe(startWith(undefined))),
    ),
  );
  protected readonly totalEnvios = computed(() =>
    (this.envios() ?? []).filter((e) => e.estado === 'entregado').reduce((a, e) => a + e.gananciaRider, 0),
  );

  protected readonly zonas = computed(() => (this.rider()?.zonas ?? []).map(nombreZona).join(', '));
  protected readonly desde = computed(() => {
    const d = this.rider()?.riderDesde;
    return d ? `${MESES[d.getMonth()]} ${d.getFullYear()}` : '';
  });
  protected readonly codigo = (numero: number) => codigoPedido({ numero });
  protected readonly textoEstado = TEXTO_ESTADO;
  protected readonly codigoRider = codigoRider;

  protected alternarPausa(): void {
    const r = this.rider();
    if (!r) return;
    if (!r.pausado && !confirm(`¿Pausar a ${r.nombre}? Pasa a OFF y no puede conectarse hasta que lo reactives.`)) return;
    this.enviando.set(true);
    this.api.pausarRider(r.id, !r.pausado).subscribe({ next: () => this.enviando.set(false), error: () => this.enviando.set(false) });
  }
}
