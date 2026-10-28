import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  BarraEstado,
  FREEDELI_CONFIG,
  Pedido,
  PedidosApi,
  PesosPipe,
  cantidadProductos,
  codigoPedido,
  linkComoLlegar,
  linkWhatsApp,
  nombreZona,
  pinValido,
} from '@freedeli/shared';
import { interval, take } from 'rxjs';
import { RiderStore } from '../../core/rider.store';
import { Sonidos } from '../../core/sonidos';
import { PinInput } from '../../ui/pin-input';

const MOTIVOS: Record<string, string> = {
  'pin-incorrecto': 'PIN incorrecto. Pedíselo de nuevo al cliente.',
  'estado-invalido': 'Este pedido todavía no está en camino.',
  'no-encontrado': 'No encontramos el pedido. Escribinos por WhatsApp.',
};

@Component({
  selector: 'fd-vivo',
  imports: [BarraEstado, PesosPipe, PinInput, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './vivo.html',
  styleUrl: './vivo.scss',
})
export default class Vivo {
  private readonly api = inject(PedidosApi);
  private readonly config = inject(FREEDELI_CONFIG);
  private readonly sonidos = inject(Sonidos);
  protected readonly store = inject(RiderStore);

  protected readonly pedido = toSignal(this.api.enCursoDelRider(), { initialValue: undefined });
  /** El pedido recién entregado, para mostrar la pantalla de éxito. */
  protected readonly entregado = signal<Pedido | null>(null);

  /** Por qué el pedido dejó de estar en curso sin que el rider lo entregue: el kiosco eligió otro rider, se canceló o lo cerró Dev. */
  protected readonly aviso = signal<string | null>(null);

  protected readonly pin = signal('');
  protected readonly errorPin = signal<string | null>(null);
  protected readonly enviando = signal(false);
  private readonly pinInput = viewChild(PinInput);

  private readonly ahora = toSignal(interval(1000).pipe(takeUntilDestroyed()), { initialValue: 0 });

  protected readonly tiempo = computed(() => {
    this.ahora();
    const p = this.pedido();
    if (!p) return '';
    const desde = (p.aceptadoEn ?? p.creadoEn).getTime();
    const seg = Math.max(0, Math.floor((Date.now() - desde) / 1000));
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    const s = seg % 60;
    const dos = (n: number) => n.toString().padStart(2, '0');
    return h > 0 ? `${h}:${dos(m)}:${dos(s)}` : `${dos(m)}:${dos(s)}`;
  });

  constructor() {
    let anterior: Pedido | null | undefined;
    effect(() => {
      const actual = this.pedido();
      const cerrado = anterior;
      if (cerrado && actual === null) untracked(() => !this.entregado() && this.avisarCierre(cerrado));
      if (actual) this.aviso.set(null);
      anterior = actual;
    });
  }

  /** El pedido dejó de estar en curso sin que el rider ingresara el PIN. */
  private avisarCierre(p: Pedido): void {
    const codigo = codigoPedido(p);
    // En aprobación, desaparecer sin pasar a Aceptado es que el kiosco eligió otro rider.
    if (p.estado === 'esperando') {
      this.aviso.set(`El kiosco eligió otro rider para el pedido ${codigo}.`);
      return;
    }
    this.api
      .observar(p.id)
      .pipe(take(1))
      .subscribe((final) => {
        if (final?.estado === 'entregado') this.aviso.set(`FreeDeli marcó el pedido ${codigo} como entregado.`);
        else if (final?.cancelacion?.riderCobra) this.aviso.set(`Se canceló el pedido ${codigo}. Ya hiciste más de la mitad del viaje: el kiosco te paga el envío. Devolvé los productos al kiosco.`);
        else if (final?.estado === 'cancelado') this.aviso.set(`Se canceló el pedido ${codigo}. Si ya lo retiraste, devolvé los productos al kiosco.`);
      });
  }

  protected readonly codigo = codigoPedido;
  protected readonly zona = nombreZona;
  protected readonly cantidad = cantidadProductos;
  /** El rider no cobra nada en mano: todo es por transferencia. */
  protected readonly textoPago = { pendiente: 'PENDIENTE', transferido: 'TRANSFERIDO', liberado: 'LIBERADO' } as const;

  /** Antes de retirar se va al kiosco; después, al punto exacto donde estaba el celular del cliente al pedir. */
  protected readonly linkMapa = computed(() => {
    const p = this.pedido();
    if (!p) return '';
    if (p.estado === 'aceptado') return linkComoLlegar(`${p.kioscoDireccion}, ${nombreZona(p.zona)}, Buenos Aires`);
    return linkComoLlegar(`${p.destino.ubicacion.lat},${p.destino.ubicacion.lng}`);
  });

  protected readonly linkWhatsApp = computed(() => {
    const p = this.pedido() ?? this.entregado();
    return linkWhatsApp(this.config.whatsapp, p ? `Hola FreeDeli, soy rider. Te escribo por el pedido ${codigoPedido(p)}.` : undefined);
  });

  protected avanzar(p: Pedido): void {
    this.enviando.set(true);
    this.api.avanzarEstado(p.id).subscribe({
      next: () => {
        this.sonidos.click();
        this.enviando.set(false);
      },
      error: () => this.enviando.set(false),
    });
  }

  protected confirmarEntrega(p: Pedido): void {
    if (!pinValido(this.pin())) {
      this.errorPin.set('Ingresá los 4 dígitos del PIN.');
      return;
    }
    this.enviando.set(true);
    this.errorPin.set(null);
    this.api.confirmarEntrega(p.id, this.pin()).subscribe((r) => {
      this.enviando.set(false);
      if (r.ok) {
        this.sonidos.start();
        this.pin.set('');
        this.entregado.set(r.pedido);
      } else {
        this.sonidos.error();
        this.errorPin.set(MOTIVOS[r.motivo]);
        this.pinInput()?.limpiar();
      }
    });
  }

  protected cerrarEntregado(): void {
    this.entregado.set(null);
  }
}
