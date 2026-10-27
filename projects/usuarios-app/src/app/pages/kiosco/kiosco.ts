import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { PEDIDO_MINIMO, PesosPipe, Producto, UsuariosApi, nombreZona, rangoTiempo } from '@freedeli/shared';
import { combineLatest, distinctUntilChanged, filter, map, shareReplay, switchMap, take, tap } from 'rxjs';
import { UsuarioStore } from '../../core/usuario.store';
import { formatearKm } from '../kioscos/kioscos';
import { Horario } from '../../core/horario';
import { AvisoHorario } from '../../ui/aviso-horario';

const MOTIVOS = {
  'kiosco-cerrado': 'El kiosco cerró recién. Elegí otro.',
  'sin-productos': 'Agregá al menos un producto.',
  'producto-inexistente': 'Algún producto ya no está disponible. Revisá el pedido.',
  'pedido-minimo': 'El pedido mínimo es de $15.000 en productos.',
  'pedido-en-curso': 'Ya tenés un pedido en curso.',
  'fuera-de-horario': 'FreeDeli toma pedidos de 00 a 08 hs.',
  'fuera-de-cobertura': 'Tu dirección está fuera del área donde entrega FreeDeli.',
} as const;

/** Tope por producto, para evitar errores de tipeo. */
const MAXIMO_POR_PRODUCTO = 20;

@Component({
  selector: 'fd-kiosco',
  imports: [PesosPipe, RouterLink, AvisoHorario],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kiosco.html',
  styleUrl: './kiosco.scss',
})
export default class Kiosco {
  private readonly api = inject(UsuariosApi);
  private readonly router = inject(Router);
  protected readonly store = inject(UsuarioStore);
  protected readonly horario = inject(Horario);

  readonly kioscoId = input.required<string>();
  /** Id de un pedido anterior para cargar los mismos productos. */
  readonly repetir = input<string | undefined>(undefined);

  protected readonly cantidades = signal<Record<string, number>>({});
  /** Al cambiar de kiosco se vacía el carrito. */
  private readonly id$ = toObservable(this.kioscoId).pipe(tap(() => this.cantidades.set({})), shareReplay(1));
  /** undefined mientras carga; null si no existe. */
  protected readonly kiosco = toSignal(this.id$.pipe(switchMap((id) => this.api.kiosco(id))));
  protected readonly productos = toSignal(this.id$.pipe(switchMap((id) => this.api.productos(id))), { initialValue: [] as Producto[] });

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly cantidad = computed(() => Object.values(this.cantidades()).reduce((a, n) => a + n, 0));
  protected readonly subtotal = computed(() =>
    this.productos().reduce((a, p) => a + (this.cantidades()[p.id] ?? 0) * p.precio, 0),
  );
  protected readonly total = computed(() => this.subtotal() + (this.kiosco()?.costoEnvio ?? 0));
  /** Cuánto falta en productos para llegar al pedido mínimo. */
  protected readonly faltante = computed(() => Math.max(0, PEDIDO_MINIMO - this.subtotal()));
  protected readonly minimo = PEDIDO_MINIMO;

  protected readonly zona = nombreZona;
  protected readonly tiempo = rangoTiempo;
  protected readonly maximo = MAXIMO_POR_PRODUCTO;
  protected readonly km = formatearKm;

  constructor() {
    // "Pedí de nuevo": carga los productos del pedido anterior que sigan en el catálogo.
    combineLatest([toObservable(this.repetir), toObservable(this.productos)])
      .pipe(
        // Espera el catálogo del kiosco actual, no el del anterior.
        filter(([pedidoId, catalogo]) => !!pedidoId && catalogo[0]?.kioscoId === this.kioscoId()),
        distinctUntilChanged(([a], [b]) => a === b),
        switchMap(([pedidoId, catalogo]) => this.api.pedido(pedidoId!).pipe(take(1), map((p) => ({ p, catalogo })))),
        takeUntilDestroyed(),
      )
      .subscribe(({ p, catalogo }) => {
        if (!p) return;
        const cant: Record<string, number> = {};
        for (const item of p.items) {
          if (catalogo.some((x) => x.id === item.productoId)) cant[item.productoId] = item.cantidad;
        }
        this.cantidades.set(cant);
      });
  }

  protected cambiar(p: Producto, delta: number): void {
    this.error.set(null);
    this.cantidades.update((c) => {
      const n = Math.min(MAXIMO_POR_PRODUCTO, Math.max(0, (c[p.id] ?? 0) + delta));
      const { [p.id]: _, ...resto } = c;
      return n > 0 ? { ...resto, [p.id]: n } : resto;
    });
  }

  protected hacerPedido(): void {
    if (this.cantidad() === 0) {
      this.error.set(MOTIVOS['sin-productos']);
      return;
    }
    if (this.faltante() > 0) {
      this.error.set(MOTIVOS['pedido-minimo']);
      return;
    }
    this.enviando.set(true);
    const items = Object.entries(this.cantidades()).map(([productoId, cantidad]) => ({ productoId, cantidad }));
    this.api.crearPedido({ kioscoId: this.kioscoId(), items }).subscribe((r) => {
      this.enviando.set(false);
      if (r.ok) {
        void this.router.navigate(['/pedido', r.pedido.id, 'realizado']);
      } else {
        this.error.set(MOTIVOS[r.motivo]);
      }
    });
  }
}

