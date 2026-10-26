import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { PesosPipe, UsuariosApi, ZONAS, ZonaId, nombreZona, rangoTiempo } from '@freedeli/shared';
import { startWith, switchMap } from 'rxjs';

const FILTROS: { id: ZonaId | null; etiqueta: string }[] = [{ id: null, etiqueta: 'Todas' }, ...ZONAS.map((z) => ({ id: z.id, etiqueta: z.nombre }))];

/** Inicial para el cuadrito del kiosco: "Kiosco El Faro" → "E". */
export function inicialKiosco(nombre: string): string {
  return nombre.replace(/^(Maxikiosco|Kiosco|Drugstore)\s+/i, '').replace(/^(El|La|Los|Las)\s+/i, '').charAt(0).toUpperCase();
}

@Component({
  selector: 'fd-kioscos',
  imports: [RouterLink, PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './kioscos.html',
  styleUrl: './kioscos.scss',
})
export default class Kioscos {
  private readonly api = inject(UsuariosApi);
  private readonly router = inject(Router);

  /** Filtro de zona, guardado en la URL (?zona=muniz) para que "Volver" lo conserve. */
  readonly zona = input<ZonaId | undefined>(undefined);
  protected readonly filtroActual = computed(() => (ZONAS.some((z) => z.id === this.zona()) ? this.zona()! : null));

  protected readonly filtros = FILTROS;
  protected readonly kioscos = toSignal(
    toObservable(this.filtroActual).pipe(switchMap((z) => this.api.kioscosAbiertos(z ?? undefined).pipe(startWith(undefined)))),
  );

  protected readonly nombreZona = nombreZona;
  protected readonly tiempo = rangoTiempo;
  protected readonly inicial = inicialKiosco;

  protected filtrar(zona: ZonaId | null): void {
    void this.router.navigate([], { queryParams: { zona }, replaceUrl: true });
  }
}
