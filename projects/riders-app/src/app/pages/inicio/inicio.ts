import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DemandaZona, RidersApi, ZONAS, ZonaId, pedidosPorRider, repartirProbabilidad } from '@freedeli/shared';
import { Subject, switchMap, timer } from 'rxjs';
import { RiderStore } from '../../core/rider.store';
import { Sonidos } from '../../core/sonidos';

/** Cada cuánto se refresca la demanda por zona, en ms. */
const REFRESCO_DEMANDA = 60_000;

interface FilaZona {
  id: ZonaId;
  nombre: string;
  elegida: boolean;
  chance: number;
  pedidos: number;
  riders: number;
  anchoPedidos: string;
  anchoRiders: string;
  relacion: string;
}

@Component({
  selector: 'fd-inicio',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export default class Inicio {
  protected readonly store = inject(RiderStore);
  private readonly api = inject(RidersApi);
  private readonly sonidos = inject(Sonidos);

  private readonly refrescar$ = new Subject<void>();
  protected readonly demanda = signal<DemandaZona[]>([]);
  protected readonly aviso = signal<string | null>(null);

  protected readonly filas = computed<FilaZona[]>(() => {
    const elegidas = this.store.zonas();
    const chances = repartirProbabilidad(elegidas);
    const demanda = this.demanda();
    const maxPedidos = Math.max(1, ...demanda.map((d) => d.pedidosJornada));
    const maxRiders = Math.max(1, ...demanda.map((d) => d.ridersActivos));
    return ZONAS.map((z) => {
      const d = demanda.find((x) => x.zona === z.id) ?? { zona: z.id, pedidosJornada: 0, ridersActivos: 0 };
      return {
        id: z.id,
        nombre: z.nombre,
        elegida: elegidas.includes(z.id),
        chance: chances[z.id],
        pedidos: d.pedidosJornada,
        riders: d.ridersActivos,
        anchoPedidos: `${Math.round((d.pedidosJornada / maxPedidos) * 100)}%`,
        anchoRiders: `${Math.round((d.ridersActivos / maxRiders) * 100)}%`,
        relacion: this.textoRelacion(d),
      };
    });
  });

  constructor() {
    // Refresca al entrar, cada minuto y cada vez que se pide (ON/OFF o cambio de zonas).
    this.refrescar$
      .pipe(
        switchMap(() => timer(0, REFRESCO_DEMANDA)),
        switchMap(() => this.api.demanda()),
        takeUntilDestroyed(),
      )
      .subscribe((d) => this.demanda.set(d));

    // Primera carga, y de nuevo al terminar de guardar: el rider suma o resta en sus zonas.
    effect(() => {
      if (!this.store.guardando()) this.refrescar$.next();
    });
  }

  protected alternarDisponible(): void {
    if (this.store.disponible()) {
      this.sonidos.off();
    } else {
      this.sonidos.start();
    }
    this.store.alternarDisponible();
  }

  protected alternarZona(zona: ZonaId): void {
    if (this.store.alternarZona(zona)) {
      this.aviso.set(null);
      this.sonidos.click();
    } else {
      this.aviso.set('Tenés que tener al menos una zona elegida.');
      this.sonidos.error();
    }
  }

  private textoRelacion(d: DemandaZona): string {
    if (d.pedidosJornada === 0) return 'Sin pedidos hoy';
    if (d.ridersActivos === 0) return 'Sin riders activos: ¡zona libre!';
    const n = pedidosPorRider(d).toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    return `${n} pedidos por rider`;
  }
}
