import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AdminApi, AltaPendiente, nombreZona } from '@freedeli/shared';
import { DocumentosRider } from './documentos-rider';

const FECHA = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

/** Kioscos y riders que se registraron y esperan la aprobación del dueño. */
@Component({
  selector: 'fd-panel-altas',
  imports: [DocumentosRider],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (altas().length > 0) {
      <section class="panel" aria-labelledby="titulo-altas">
        <h2 id="titulo-altas" class="subtitulo">ALTAS PENDIENTES · {{ altas().length }}</h2>
        <ul class="lista">
          @for (a of altas(); track a.id) {
            <li>
              <span class="chip">{{ a.rol === 'KIOSCO' ? 'KIOSCO' : 'RIDER' }}</span>
              <div class="datos">
                @if (a.kiosco; as k) {
                  <strong>{{ k.nombre }}</strong>
                  <span class="sutil">{{ k.direccion }} · {{ zona(k.zona) }} · alias {{ k.aliasCobro }} · {{ a.email }}</span>
                }
                @if (a.rider; as r) {
                  <strong>{{ r.nombre }}</strong>
                  <span class="sutil">DNI {{ r.dni }} · {{ r.telefono }} · {{ r.vehiculoModelo }} {{ r.patente }} · {{ a.email }}</span>
                  <fd-documentos-rider [riderId]="r.id" />
                }
                <span class="sutil">Pedida el {{ fecha(a.creadaEn) }}</span>
              </div>
              <div class="acciones">
                <button type="button" class="boton" [disabled]="enviando() === a.id" (click)="resolver(a, false)">Rechazar</button>
                <button type="button" class="boton primario" [disabled]="enviando() === a.id" (click)="resolver(a, true)">Aprobar</button>
              </div>
            </li>
          }
        </ul>
      </section>
    }
  `,
  styles: `
    @use 'panel';
    /* Sin caja propia: no suma espacio en MAIN cuando no muestra nada. */
    :host { display: contents; }
    .panel { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; background: #0f1f4a; box-shadow: inset 4px 0 0 var(--fd-yellow-400); }
    .lista { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
    li { padding: 12px; display: flex; align-items: center; gap: 14px; background: var(--fd-navy-700); flex-wrap: wrap; }
    .datos { flex: 1 1 280px; display: flex; flex-direction: column; gap: 4px; }
    .acciones { display: flex; gap: 8px; }
    .primario { background: var(--fd-yellow-400); color: var(--fd-navy-900); }
  `,
})
export class PanelAltas {
  private readonly api = inject(AdminApi);
  protected readonly altas = toSignal(this.api.altasPendientes(), { initialValue: [] as AltaPendiente[] });
  protected readonly enviando = signal<string | null>(null);
  protected readonly zona = nombreZona;
  protected readonly fecha = (d: Date) => FECHA.format(d);

  protected resolver(a: AltaPendiente, aprobada: boolean): void {
    const nombre = a.kiosco?.nombre ?? a.rider?.nombre ?? a.email;
    if (!aprobada && !confirm(`¿Rechazar el alta de ${nombre}?`)) return;
    this.enviando.set(a.id);
    this.api.resolverAlta(a.id, aprobada).subscribe({ next: () => this.enviando.set(null), error: () => this.enviando.set(null) });
  }
}
