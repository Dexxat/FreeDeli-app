import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ABANDONOS_PARA_PAUSA, AdminApi, BarraEstado, PeriodoAdmin, PesosPipe, codigoPedido, codigoRider, mensajeDeError, nombreZona } from '@freedeli/shared';
import { Observable, combineLatest, startWith, switchMap } from 'rxjs';
import { SelectorPeriodo } from '../../ui/zonas';
import { TEXTO_ESTADO } from '../main/main';
import { DocumentosRider } from '../../ui/documentos-rider';
import { Incidente } from '../../ui/incidente';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

@Component({
  selector: 'fd-rider',
  imports: [PesosPipe, RouterLink, BarraEstado, SelectorPeriodo, DocumentosRider, Incidente],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rider.html',
  styleUrl: './rider.scss',
})
export default class Rider {
  private readonly api = inject(AdminApi);
  readonly riderId = input.required<string>();

  protected readonly periodo = signal<PeriodoAdmin>('jornada');
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly abandonosParaPausa = ABANDONOS_PARA_PAUSA;

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
    this.hacer(this.api.pausarRider(r.id, !r.pausado));
  }

  /** Baja definitiva: por abandonos o por fallas reiteradas con la batería, la señal o los papeles. */
  protected darDeBaja(): void {
    const r = this.rider();
    if (!r || !confirm(`¿Dar de baja a ${r.nombre}? Ya no va a poder ingresar a FreeDeli Riders.`)) return;
    this.hacer(this.api.darDeBajaRider(r.id));
  }

  private hacer(llamada: Observable<unknown>): void {
    this.enviando.set(true);
    this.error.set(null);
    llamada.subscribe({
      next: () => this.enviando.set(false),
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e, e instanceof Error ? e.message : undefined));
      },
    });
  }
}
