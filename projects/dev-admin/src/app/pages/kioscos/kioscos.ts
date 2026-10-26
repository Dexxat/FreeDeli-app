import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AdminApi, KioscoAdmin, PesosPipe, nombreZona } from '@freedeli/shared';

/** "Abierto", "Cerrado" o "Pausado" (la pausa de FreeDeli manda sobre el horario). */
export function estadoKiosco(k: Pick<KioscoAdmin, 'abierto' | 'pausado'>): 'Pausado' | 'Abierto' | 'Cerrado' {
  if (k.pausado) return 'Pausado';
  return k.abierto ? 'Abierto' : 'Cerrado';
}

@Component({
  selector: 'fd-kioscos',
  imports: [PesosPipe, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="encabezado">
      <a class="enlace" routerLink="/main">&lt; MAIN</a>
      <h1 class="titulo">KIOSCOS Y SALDOS</h1>
      <p class="sutil">Saldo prepago: de ahí se descuentan las comisiones. Sin saldo o pausados, no reciben pedidos.</p>
    </div>
    <div class="tabla-caja">
      <table>
        <thead>
          <tr>
            <th scope="col">Kiosco</th><th scope="col">Zona</th><th scope="col">Estado</th>
            <th scope="col" class="num">Saldo</th><th scope="col" class="num">Pedidos hoy</th>
            <th scope="col" class="num">Comisión hoy</th><th scope="col"><span class="sr">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          @for (k of kioscos(); track k.id) {
            <tr>
              <td><a class="enlace" [routerLink]="['/kioscos', k.id]">{{ k.nombre }}</a></td>
              <td>{{ zona(k.zona) }}</td>
              <td><span class="chip" [class.ok]="estado(k) === 'Abierto'" [class.alerta]="estado(k) === 'Pausado'">{{ estado(k) }}</span></td>
              <td class="num" [class.alerta-texto]="k.saldoBajo">{{ k.saldo | pesos }}</td>
              <td class="num">{{ k.pedidosHoy }}</td>
              <td class="num">{{ k.comisionHoy | pesos }}</td>
              <td>
                <button type="button" class="boton" [class.peligro]="!k.pausado" [disabled]="enviando() === k.id" (click)="alternarPausa(k)">
                  {{ k.pausado ? 'Reactivar' : 'Pausar' }}
                </button>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styles: `
    @use 'panel';
    :host { display: flex; flex-direction: column; gap: 20px; }
    .encabezado { display: flex; flex-direction: column; gap: 8px; }
    .sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }
  `,
})
export default class Kioscos {
  private readonly api = inject(AdminApi);
  protected readonly kioscos = toSignal(this.api.kioscos(), { initialValue: [] });
  protected readonly enviando = signal<string | null>(null);
  protected readonly zona = nombreZona;
  protected readonly estado = estadoKiosco;

  protected alternarPausa(k: KioscoAdmin): void {
    if (!k.pausado && !confirm(`¿Pausar ${k.nombre}? Deja de recibir pedidos.`)) return;
    this.enviando.set(k.id);
    this.api.pausarKiosco(k.id, !k.pausado).subscribe({ next: () => this.enviando.set(null), error: () => this.enviando.set(null) });
  }
}
