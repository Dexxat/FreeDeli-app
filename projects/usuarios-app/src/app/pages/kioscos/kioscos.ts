import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { PesosPipe, UsuariosApi, ZONAS, ZonaId, nombreZona, rangoTiempo } from '@freedeli/shared';
import { of, startWith, switchMap } from 'rxjs';
import { UbicacionCliente } from '../../core/ubicacion';
import { AvisoHorario } from '../../ui/aviso-horario';
import { AvisoUbicacion } from '../../ui/aviso-ubicacion';

const FILTROS: { id: ZonaId | null; etiqueta: string }[] = [{ id: null, etiqueta: 'Todas' }, ...ZONAS.map((z) => ({ id: z.id, etiqueta: z.nombre }))];

/** 2.3 → "2,3 km". */
export function formatearKm(km?: number): string {
  return km === undefined ? '' : `${km.toLocaleString('es-AR', { maximumFractionDigits: 1 })} km`;
}

/** Inicial para el cuadrito del kiosco: "Kiosco El Faro" → "E". */
export function inicialKiosco(nombre: string): string {
  return nombre.replace(/^(Maxikiosco|Kiosco|Drugstore)\s+/i, '').replace(/^(El|La|Los|Las)\s+/i, '').charAt(0).toUpperCase();
}

@Component({
  selector: 'fd-kioscos',
  imports: [AvisoHorario, AvisoUbicacion, RouterLink, PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kioscos.html',
  styleUrl: './kioscos.scss',
})
export default class Kioscos {
  private readonly api = inject(UsuariosApi);
  private readonly router = inject(Router);
  private readonly ubicacion = inject(UbicacionCliente);

  /** Filtro de zona, guardado en la URL (?zona=muniz) para que "Volver" lo conserve. */
  readonly zona = input<ZonaId | undefined>(undefined);
  protected readonly filtroActual = computed(() => (ZONAS.some((z) => z.id === this.zona()) ? this.zona()! : null));

  protected readonly filtros = FILTROS;
  private readonly busqueda = computed(() => ({ zona: this.filtroActual(), desde: this.ubicacion.ubicacion() }));
  protected readonly kioscos = toSignal(
    toObservable(this.busqueda).pipe(
      switchMap(({ zona, desde }) => (desde ? this.api.kioscosAbiertos(desde, zona ?? undefined).pipe(startWith(undefined)) : of(undefined))),
    ),
  );

  protected readonly nombreZona = nombreZona;
  protected readonly tiempo = rangoTiempo;
  protected readonly inicial = inicialKiosco;
  protected readonly km = formatearKm;

  protected filtrar(zona: ZonaId | null): void {
    void this.router.navigate([], { queryParams: { zona }, replaceUrl: true });
  }
}
