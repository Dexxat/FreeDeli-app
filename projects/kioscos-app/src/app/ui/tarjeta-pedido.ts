import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { FREEDELI_CONFIG, KioscosApi, Pedido, PesosPipe, aporteKioscoEnvio, linkWhatsApp, cantidadProductos, codigoPedido, subtotalProductos, totalPedido } from '@freedeli/shared';
import { Observable, of, switchMap } from 'rxjs';

/** Etiqueta del paso en el que está el pedido, desde el punto de vista del kiosco. */
export function pasoKiosco(p: Pedido): string {
  if (p.estado === 'esperando') {
    return (
      {
        stock: 'Confirmar stock',
        ajuste: 'Esperando al cliente',
        transferencia: 'Esperando transferencia',
        rider: 'Buscando rider',
        aprobacion: 'Aprobar rider',
      } as const
    )[p.fase ?? 'stock'];
  }
  if (p.estado === 'aceptado') return p.retiro?.kiosco ? 'Esperando al rider' : 'Confirmar envío';
  if (p.estado === 'retirado') return 'Retirado';
  if (p.estado === 'en-camino') return 'En camino';
  return p.estado;
}

const HORA = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

@Component({
  selector: 'fd-tarjeta-pedido',
  imports: [PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './tarjeta-pedido.html',
  styleUrl: './tarjeta-pedido.scss',
})
export class TarjetaPedido {
  private readonly api = inject(KioscosApi);
  readonly pedido = input.required<Pedido>();
  /** Resaltar: la acción es del kiosco. */
  readonly accion = input(false);

  protected readonly faltantes = signal<string[]>([]);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly rider = toSignal(
    toObservable(computed(() => this.pedido().riderId)).pipe(
      switchMap((id): Observable<{ nombre: string; vehiculo: string; patente: string } | null> => (id ? this.api.rider(id) : of(null))),
    ),
  );

  protected readonly codigo = computed(() => codigoPedido(this.pedido()));
  private readonly whatsapp = inject(FREEDELI_CONFIG).whatsapp;
  /** Cualquier problema con el pedido se resuelve por WhatsApp con la asistencia. */
  protected readonly ayuda = computed(() => linkWhatsApp(this.whatsapp, `Hola FreeDeli, te escribo por el pedido ${this.codigo()}.`));
  protected readonly paso = computed(() => pasoKiosco(this.pedido()));
  protected readonly hora = computed(() => HORA.format(this.pedido().creadoEn));
  protected readonly cantidad = computed(() => cantidadProductos(this.pedido()));
  protected readonly total = computed(() => totalPedido(this.pedido()));
  protected readonly subtotal = computed(() => subtotalProductos(this.pedido()));
  /** Lo que pone el kiosco porque el viaje supera el tope que paga el cliente. */
  protected readonly aporteEnvio = computed(() => aporteKioscoEnvio(this.pedido()));
  protected readonly envioRider = computed(() => this.pedido().gananciaRider + this.pedido().propina);

  protected alternarFaltante(productoId: string, falta: boolean): void {
    this.faltantes.update((fs) => (falta ? [...fs, productoId] : fs.filter((f) => f !== productoId)));
  }

  private hacer(llamada: Observable<Pedido>): void {
    this.enviando.set(true);
    this.error.set(null);
    llamada.subscribe({
      next: () => {
        this.enviando.set(false);
        this.faltantes.set([]);
      },
      error: (e: Error) => {
        this.enviando.set(false);
        this.error.set(e.message);
      },
    });
  }

  protected confirmarStock(): void {
    const faltan = this.faltantes();
    if (faltan.length === this.pedido().items.length && !confirm('No hay ningún producto: el pedido se cancela. ¿Seguro?')) return;
    this.hacer(this.api.confirmarStock(this.pedido().id, faltan));
  }

  protected confirmarTransferencia(): void {
    this.hacer(this.api.confirmarTransferencia(this.pedido().id));
  }

  protected aprobar(aprobado: boolean): void {
    this.hacer(this.api.aprobarRider(this.pedido().id, aprobado));
  }

  protected confirmarEnvio(): void {
    this.hacer(this.api.confirmarEnvio(this.pedido().id));
  }
}
