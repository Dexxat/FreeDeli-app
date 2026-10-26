import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  BarraEstado,
  FREEDELI_CONFIG,
  PesosPipe,
  UsuariosApi,
  codigoPedido,
  linkWhatsApp,
  minutosParaLlegar,
  totalPedido,
} from '@freedeli/shared';
import { PasoActual } from '../../ui/paso-actual';
import { distinctUntilChanged, interval, map, of, startWith, switchMap } from 'rxjs';

const HORA = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

@Component({
  selector: 'fd-seguimiento',
  imports: [BarraEstado, PesosPipe, RouterLink, PasoActual],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './seguimiento.html',
  styleUrl: './seguimiento.scss',
})
export default class Seguimiento {
  private readonly api = inject(UsuariosApi);
  private readonly config = inject(FREEDELI_CONFIG);

  /** Sin id (pestaña MI PEDIDO) se muestra el pedido en curso. */
  readonly pedidoId = input<string | undefined>(undefined);

  /** undefined mientras carga; null si no hay pedido. */
  protected readonly pedido = toSignal(
    toObservable(this.pedidoId).pipe(switchMap((id) => (id ? this.api.pedido(id) : this.seguirEnCurso()))),
  );

  /**
   * Sigue al pedido en curso por su id, así al entregarse se ve la confirmación
   * en lugar de "no tenés pedidos" (al entregarse deja de estar en curso).
   */
  private seguirEnCurso() {
    let ultimo: string | null = null;
    return this.api.pedidoEnCurso().pipe(
      map((p) => (ultimo = p?.id ?? ultimo)),
      distinctUntilChanged(),
      switchMap((id) => (id ? this.api.pedido(id) : of(null))),
    );
  }

  private readonly kiosco = toSignal(
    toObservable(computed(() => this.pedido()?.kioscoId)).pipe(switchMap((id) => (id ? this.api.kiosco(id) : of(null)))),
  );

  /** Se vuelve a pedir cuando cambia el rider o el estado (aparece al aceptar). */
  protected readonly rider = toSignal(
    toObservable(computed(() => {
      const p = this.pedido();
      return p ? `${p.id}|${p.riderId ?? ''}|${p.estado}` : null;
    })).pipe(switchMap((clave) => (clave ? this.api.riderAsignado(clave.split('|')[0]) : of(null)))),
  );

  private readonly ahora = toSignal(interval(30_000).pipe(startWith(0), map(() => new Date())), { initialValue: new Date() });

  protected readonly minutos = computed(() => {
    const p = this.pedido();
    const k = this.kiosco();
    return p && k ? minutosParaLlegar(p, k.tiempoEstimadoMin, this.ahora()) : null;
  });

  protected readonly digitos = computed(() => [...(this.pedido()?.pin ?? '')]);
  protected readonly codigo = codigoPedido;
  protected readonly total = totalPedido;
  protected readonly hora = (d?: Date) => (d ? HORA.format(d) : '');

  protected readonly whatsapp = computed(() => {
    const p = this.pedido();
    return linkWhatsApp(this.config.whatsapp, p ? `Hola FreeDeli, te escribo por mi pedido ${codigoPedido(p)}.` : undefined);
  });
}
