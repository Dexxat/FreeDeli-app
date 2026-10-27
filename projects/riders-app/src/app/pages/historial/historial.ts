import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Pedido, PeriodoHistorial, PesosPipe, RidersApi, codigoPedido, nombreZona } from '@freedeli/shared';
import { startWith, switchMap } from 'rxjs';

const PERIODOS: { id: PeriodoHistorial; etiqueta: string }[] = [
  { id: 'hoy', etiqueta: 'HOY' },
  { id: 'semana', etiqueta: 'SEMANA' },
  { id: 'mes', etiqueta: 'MES' },
];

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const dos = (n: number) => n.toString().padStart(2, '0');
/** "Lun 26/10" */
const dia = (d: Date) => `${DIAS[d.getDay()]} ${dos(d.getDate())}/${dos(d.getMonth() + 1)}`;
const HORA = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

/** Lo que cobra el rider por un pedido: envío + propina, o nada si se canceló. */
export function montoRider(p: Pedido): number {
  return p.estado === 'entregado' ? p.gananciaRider + p.propina : 0;
}

@Component({
  selector: 'fd-historial',
  imports: [PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './historial.html',
  styleUrl: './historial.scss',
})
export default class Historial {
  private readonly api = inject(RidersApi);

  protected readonly periodos = PERIODOS;
  protected readonly periodo = signal<PeriodoHistorial>('hoy');

  /** undefined mientras carga. */
  protected readonly pedidos = toSignal(
    toObservable(this.periodo).pipe(
      switchMap((p) => this.api.historial(p).pipe(startWith(undefined))),
    ),
  );

  protected readonly resumen = computed(() => {
    const lista = this.pedidos() ?? [];
    return {
      cantidad: lista.length,
      cancelados: lista.filter((p) => p.estado === 'cancelado').length,
      total: lista.reduce((a, p) => a + montoRider(p), 0),
    };
  });

  protected readonly filas = computed(() =>
    (this.pedidos() ?? []).map((p) => ({
      id: p.id,
      cuando: this.periodo() === 'hoy' ? HORA.format(p.creadoEn) : `${dia(p.creadoEn)} · ${HORA.format(p.creadoEn)}`,
      codigo: codigoPedido(p),
      desde: p.kioscoNombre,
      hacia: p.destino.direccion,
      zona: nombreZona(p.zona),
      entregado: p.estado === 'entregado',
      monto: montoRider(p),
    })),
  );
}
