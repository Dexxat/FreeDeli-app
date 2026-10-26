import { ChangeDetectionStrategy, Component, ElementRef, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { OfertaPedido, PedidosApi, PesosPipe, SEGUNDOS_PARA_ACEPTAR, codigoPedido, nombreZona } from '@freedeli/shared';
import { interval, map } from 'rxjs';
import { Sonidos } from '../core/sonidos';

const MOTIVOS = {
  vencida: 'Se terminó el tiempo. El pedido pasó a otro rider.',
  'ya-tomado': 'Otro rider tomó este pedido.',
  'no-encontrado': 'Este pedido ya no está disponible.',
} as const;

/** Aviso de pedido nuevo. Se muestra encima de cualquier sección. */
@Component({
  selector: 'fd-oferta-entrante',
  imports: [PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (oferta(); as o) {
      <div class="fondo">
        <section class="aviso" role="alertdialog" aria-modal="true" aria-labelledby="oferta-titulo" aria-describedby="oferta-detalle">
          <div class="encabezado">
            <h2 id="oferta-titulo" class="titulo">¡PEDIDO NUEVO!</h2>
            <span class="segundos" [class.urgente]="segundos() <= 10" role="timer" [attr.aria-label]="segundos() + ' segundos para aceptar'">
              {{ segundos() }}s
            </span>
          </div>
          <div class="tiempo" aria-hidden="true"><span [style.width]="porcentaje() + '%'" [class.urgente]="segundos() <= 10"></span></div>

          <div id="oferta-detalle" class="detalle">
            <div class="parada">
              <span class="tipo">RETIRO · {{ zona(o.zona).toUpperCase() }}</span>
              <span class="nombre">{{ o.kioscoNombre }}</span>
              <span class="dir">{{ o.kioscoDireccion }}</span>
            </div>
            <div class="parada entrega">
              <span class="tipo">ENTREGA</span>
              <span class="nombre">{{ o.entregaAproximada }}</span>
            </div>
            <div class="numeros">
              <span>{{ codigo(o) }} · {{ o.cantidadProductos }} {{ o.cantidadProductos === 1 ? 'producto' : 'productos' }}</span>
              <span class="ganancia">{{ o.gananciaRider | pesos }}</span>
            </div>
          </div>

          <div class="botones">
            <button type="button" class="rechazar" [disabled]="enviando()" (click)="rechazar(o)">Rechazar</button>
            <button #aceptarBtn type="button" class="aceptar" [disabled]="enviando()" (click)="aceptar(o)">ACEPTAR</button>
          </div>
        </section>
      </div>
    }
    @if (mensaje(); as m) {
      <p class="mensaje" role="status">{{ m }}</p>
    }
  `,
  styleUrl: './oferta-entrante.scss',
})
export class OfertaEntrante {
  private readonly api = inject(PedidosApi);
  private readonly router = inject(Router);
  private readonly sonidos = inject(Sonidos);

  protected readonly oferta = toSignal(this.api.ofertaParaRider(), { initialValue: null });
  protected readonly enviando = signal(false);
  protected readonly mensaje = signal<string | null>(null);
  private readonly aceptarBtn = viewChild<ElementRef<HTMLButtonElement>>('aceptarBtn');
  /** Última oferta que el rider respondió, para no confundirla con una vencida. */
  private respondida: string | null = null;

  private readonly ahora = toSignal(interval(250).pipe(map(() => Date.now())), { initialValue: Date.now() });

  protected readonly segundos = computed(() => {
    const o = this.oferta();
    if (!o) return 0;
    // El reloj avanza cada 250 ms: se limita para no mostrar 31 s al aparecer.
    const restantes = Math.ceil((o.expiraEn.getTime() - this.ahora()) / 1000);
    return Math.min(SEGUNDOS_PARA_ACEPTAR, Math.max(0, restantes));
  });
  protected readonly porcentaje = computed(() => Math.round((this.segundos() / SEGUNDOS_PARA_ACEPTAR) * 100));

  protected readonly codigo = codigoPedido;
  protected readonly zona = nombreZona;

  constructor() {
    let ultima: string | null = null;
    effect(() => {
      const o = this.oferta();
      if (o && o.pedidoId !== ultima) {
        this.mensaje.set(null);
        this.sonidos.pedidoNuevo();
        navigator.vibrate?.([120, 60, 120]);
        queueMicrotask(() => this.aceptarBtn()?.nativeElement.focus());
      } else if (!o && ultima && ultima !== this.respondida) {
        // Desapareció sin respuesta: se venció.
        this.avisar(MOTIVOS.vencida);
      }
      ultima = o?.pedidoId ?? null;
    });
  }

  private avisar(texto: string): void {
    this.mensaje.set(texto);
    setTimeout(() => this.mensaje.set(null), 4000);
  }

  protected aceptar(o: OfertaPedido): void {
    this.respondida = o.pedidoId;
    this.enviando.set(true);
    this.api.aceptarOferta(o.pedidoId).subscribe((r) => {
      this.enviando.set(false);
      if (r.ok) {
        this.sonidos.start();
        void this.router.navigateByUrl('/vivo');
      } else {
        this.sonidos.error();
        this.avisar(MOTIVOS[r.motivo]);
      }
    });
  }

  protected rechazar(o: OfertaPedido): void {
    this.respondida = o.pedidoId;
    this.enviando.set(true);
    this.api.rechazarOferta(o.pedidoId).subscribe(() => {
      this.enviando.set(false);
      this.avisar('Pedido rechazado. Seguís en línea.');
    });
  }
}
