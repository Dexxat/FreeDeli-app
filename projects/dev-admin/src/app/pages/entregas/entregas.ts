import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { AdminApi, PeriodoAdmin, PesosPipe, ZonaId, codigoPedido, codigoRider, nombreZona } from '@freedeli/shared';
import { combineLatest, startWith, switchMap } from 'rxjs';
import { SelectorPeriodo, SelectorZonas, TODAS_LAS_ZONAS } from '../../ui/zonas';

const FECHA = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit' });
const HORA = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

@Component({
  selector: 'fd-entregas',
  imports: [PesosPipe, SelectorPeriodo, SelectorZonas],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './entregas.html',
  styleUrl: './entregas.scss',
})
export default class Entregas {
  private readonly api = inject(AdminApi);
  protected readonly periodo = signal<PeriodoAdmin>('jornada');
  protected readonly zonas = signal<ZonaId[]>(TODAS_LAS_ZONAS);

  protected readonly entregas = toSignal(
    combineLatest([toObservable(this.periodo), toObservable(this.zonas)]).pipe(
      switchMap(([p, z]) => this.api.entregas(p, z).pipe(startWith(undefined))),
    ),
  );

  protected readonly totales = computed(() => {
    const es = this.entregas() ?? [];
    const conDuracion = es.filter((e) => e.duracionMin !== null);
    return {
      cantidad: es.length,
      cliente: es.reduce((a, e) => a + e.totalCliente, 0),
      comision: es.reduce((a, e) => a + e.comisionFreeDeli, 0),
      duracion: conDuracion.length ? Math.round(conDuracion.reduce((a, e) => a + e.duracionMin!, 0) / conDuracion.length) : null,
    };
  });

  protected readonly codigo = (numero: number) => codigoPedido({ numero });
  protected readonly zona = nombreZona;
  protected readonly codigoRider = codigoRider;
  protected readonly fecha = (d?: Date) => (d ? `${FECHA.format(d)} ${HORA.format(d)}` : '—');
  protected readonly hora = (d?: Date) => (d ? HORA.format(d) : '—');
}
