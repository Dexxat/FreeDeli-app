import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminApi, PeriodoHistorial, PesosPipe, TEXTO_MOVIMIENTO, codigoPedido, nombreZona } from '@freedeli/shared';
import { combineLatest, startWith, switchMap } from 'rxjs';
import { estadoKiosco } from '../kioscos/kioscos';

const PERIODOS: { id: PeriodoHistorial; etiqueta: string }[] = [
  { id: 'hoy', etiqueta: 'Hoy' },
  { id: 'semana', etiqueta: 'Semana' },
  { id: 'mes', etiqueta: 'Mes' },
];

const FECHA = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

const ESTADOS: Record<string, string> = {
  esperando: 'Esperando rider', aceptado: 'Aceptado', retirado: 'Retirado', 'en-camino': 'En camino', entregado: 'Entregado', cancelado: 'Cancelado',
};
const PAGOS: Record<string, string> = { pendiente: 'Pendiente', transferido: 'Retenido', liberado: 'Liberado' };

@Component({
  selector: 'fd-kiosco',
  imports: [PesosPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kiosco.html',
  styleUrl: './kiosco.scss',
})
export default class Kiosco {
  protected readonly textoMovimiento = TEXTO_MOVIMIENTO;
  private readonly api = inject(AdminApi);
  readonly kioscoId = input.required<string>();

  protected readonly periodos = PERIODOS;
  protected readonly periodo = signal<PeriodoHistorial>('hoy');
  protected readonly enviando = signal(false);

  private readonly id$ = toObservable(this.kioscoId);
  protected readonly kiosco = toSignal(this.id$.pipe(switchMap((id) => this.api.kiosco(id))));
  protected readonly saldo = toSignal(this.id$.pipe(switchMap((id) => this.api.movimientosSaldo(id))), { initialValue: [] });
  protected readonly errorCarga = signal<string | null>(null);
  protected readonly cargaOk = signal<string | null>(null);
  protected readonly movimientos = toSignal(
    combineLatest([this.id$, toObservable(this.periodo), toObservable(this.kiosco)]).pipe(
      switchMap(([id, p]) => this.api.movimientosKiosco(id, p).pipe(startWith(undefined))),
    ),
  );

  protected readonly totales = computed(() => {
    const ms = this.movimientos() ?? [];
    const suma = (f: (m: (typeof ms)[number]) => number) => ms.reduce((a, m) => a + f(m), 0);
    return {
      cliente: suma((m) => m.totalCliente),
      rider: suma((m) => m.envioRider),
      comision: suma((m) => m.comisionFreeDeli),
      neto: suma((m) => m.netoKiosco),
    };
  });

  protected readonly zona = nombreZona;
  protected readonly estado = estadoKiosco;
  protected readonly codigo = (numero: number) => codigoPedido({ numero });
  protected readonly fecha = (d: Date) => FECHA.format(d);
  protected readonly textoEstado = ESTADOS;
  protected readonly textoPago = PAGOS;

  protected acreditar(montoTexto: string, referencia: string, form: HTMLFormElement): void {
    const k = this.kiosco();
    if (!k) return;
    this.errorCarga.set(null);
    this.cargaOk.set(null);
    const monto = montoDeCarga(montoTexto);
    if (monto === null) {
      this.errorCarga.set('Ingresá un monto en pesos, mayor a cero. Por ejemplo: 20000 o 20.000.');
      return;
    }
    this.api.acreditarSaldo(k.id, monto, referencia).subscribe({
      next: () => {
        this.cargaOk.set(`Se acreditaron $${monto.toLocaleString('es-AR')}.`);
        form.reset();
      },
      error: (e: Error) => this.errorCarga.set(e.message),
    });
  }

  protected alternarPausa(): void {
    const k = this.kiosco();
    if (!k) return;
    if (!k.pausado && !confirm(`¿Pausar ${k.nombre}? Deja de recibir pedidos.`)) return;
    this.enviando.set(true);
    this.api.pausarKiosco(k.id, !k.pausado).subscribe({ next: () => this.enviando.set(false), error: () => this.enviando.set(false) });
  }
}

/**
 * "20.000", "$ 20000" → 20000. Cualquier otra cosa (negativos, letras, decimales, cero) → null.
 * Antes se borraban los caracteres no numéricos y "-500" acreditaba $500.
 */
export function montoDeCarga(texto: string): number | null {
  const limpio = texto.trim().replace(/^\$\s*/, '');
  if (!/^\d{1,3}(\.\d{3})*$|^\d+$/.test(limpio)) return null;
  const monto = Number(limpio.replace(/\./g, ''));
  return monto > 0 ? monto : null;
}
