import { ChangeDetectionStrategy, Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AdminApi, Conflicto, EstadoConflicto, TIPOS_CONFLICTO, TipoConflicto, codigoPedido } from '@freedeli/shared';

const FECHA = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

export const TEXTO_ESTADO_CONFLICTO: Record<EstadoConflicto, string> = {
  abierto: 'Abierto',
  'en-seguimiento': 'En seguimiento',
  resuelto: 'Resuelto',
};

/** Diálogo para registrar un conflicto, opcionalmente atado a un pedido. */
@Component({
  selector: 'fd-dialogo-conflicto',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialogo aria-labelledby="titulo-conflicto" (close)="limpiar()">
      <form method="dialog" (submit)="$event.preventDefault(); guardar()">
        <h2 id="titulo-conflicto" class="subtitulo">REPORTAR CONFLICTO</h2>
        @if (numero(); as n) {
          <p class="sutil">Pedido {{ codigo(n) }}</p>
        }
        <label class="campo">
          <span>Tipo</span>
          <select name="tipo" [(ngModel)]="tipo">
            @for (t of tipos; track t.id) {
              <option [value]="t.id">{{ t.etiqueta }}</option>
            }
          </select>
        </label>
        <label class="campo">
          <span>Qué pasó</span>
          <textarea name="descripcion" rows="4" [(ngModel)]="descripcion" [attr.aria-invalid]="!!error()"></textarea>
        </label>
        @if (error(); as e) {
          <p class="error" role="alert">{{ e }}</p>
        }
        <div class="botones">
          <button type="button" class="boton" (click)="cerrar()">Cancelar</button>
          <button type="submit" class="boton primario" [disabled]="enviando()">Registrar</button>
        </div>
      </form>
    </dialog>
  `,
  styles: `
    @use 'panel';
    dialog {
      width: min(480px, calc(100% - 32px));
      padding: 20px;
      border: none;
      background: var(--fd-navy-700); color: #fff;
      box-shadow: 0 0 0 4px var(--fd-yellow-400), 0 12px 0 4px var(--fd-navy-900);
      &::backdrop { background: rgb(10 22 51 / 0.8); }
    }
    form { display: flex; flex-direction: column; gap: 14px; }
    .campo { display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--fd-blue-100); }
    select, textarea {
      padding: 10px 12px;
      border: none; border-radius: 0;
      background: var(--fd-blue-50); color: var(--fd-navy-900);
      font: inherit; font-size: 15px;
    }
    select { min-height: 44px; }
    .error { margin: 0; color: var(--fd-amber-400); font-weight: 700; font-size: 13px; }
    .botones { display: flex; justify-content: flex-end; gap: 10px; }
    .primario { background: var(--fd-yellow-400); color: var(--fd-navy-900); }
  `,
})
export class DialogoConflicto {
  private readonly api = inject(AdminApi);
  private readonly dialogo = viewChild.required<ElementRef<HTMLDialogElement>>('dialogo');

  protected readonly tipos = TIPOS_CONFLICTO;
  protected readonly codigo = (numero: number) => codigoPedido({ numero });
  protected readonly numero = signal<number | null>(null);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  private pedidoId: string | undefined;
  protected tipo: TipoConflicto = 'demora';
  protected descripcion = '';

  abrir(pedido?: { pedidoId: string; numero: number }): void {
    this.pedidoId = pedido?.pedidoId;
    this.numero.set(pedido?.numero ?? null);
    this.dialogo().nativeElement.showModal();
  }

  protected cerrar(): void {
    this.dialogo().nativeElement.close();
  }

  protected limpiar(): void {
    this.tipo = 'demora';
    this.descripcion = '';
    this.error.set(null);
  }

  protected guardar(): void {
    this.enviando.set(true);
    this.api.registrarConflicto({ pedidoId: this.pedidoId, tipo: this.tipo, descripcion: this.descripcion }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.cerrar();
      },
      error: (e: Error) => {
        this.enviando.set(false);
        this.error.set(e.message);
      },
    });
  }
}

/** Lista de conflictos con seguimiento: notas y cambio de estado. */
@Component({
  selector: 'fd-panel-conflictos',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="panel" aria-labelledby="titulo-conflictos">
      <div class="fila">
        <h2 id="titulo-conflictos" class="subtitulo">CONFLICTOS · {{ activos().length }} ACTIVOS</h2>
        <div class="acciones">
          @if (resueltos() > 0) {
            <button type="button" class="enlace-boton" (click)="verResueltos.set(!verResueltos())">
              {{ verResueltos() ? 'Ocultar' : 'Ver' }} resueltos ({{ resueltos() }})
            </button>
          }
          <button type="button" class="boton" (click)="nuevo()">Nuevo conflicto</button>
        </div>
      </div>
      @if (visibles().length === 0) {
        <p class="sutil">Sin conflictos activos.</p>
      } @else {
        <ul class="lista">
          @for (c of visibles(); track c.id) {
            <li [class]="c.estado">
              <details>
                <summary>
                  <span class="chip" [class.alerta]="c.estado === 'abierto'" [class.ok]="c.estado === 'resuelto'">{{ textoEstado[c.estado] }}</span>
                  <span class="tipo">{{ tipo(c.tipo) }}</span>
                  <span class="desc">{{ c.numeroPedido ? codigo(c.numeroPedido) + ' · ' : '' }}{{ c.descripcion }}</span>
                  <span class="sutil">{{ fecha(c.creadoEn) }}</span>
                </summary>
                <div class="seguimiento">
                  @if (c.notas.length > 0) {
                    <ul class="notas">
                      @for (n of c.notas; track $index) {
                        <li><span class="sutil">{{ fecha(n.fecha) }}</span> {{ n.texto }}</li>
                      }
                    </ul>
                  }
                  <form class="actualizar" (submit)="$event.preventDefault(); actualizar(c, nota.value, estado.value); nota.value = ''">
                    <input #nota name="nota" placeholder="Agregar nota de seguimiento" aria-label="Nota de seguimiento" />
                    <select #estado name="estado" [value]="c.estado" aria-label="Estado">
                      <option value="abierto">Abierto</option>
                      <option value="en-seguimiento">En seguimiento</option>
                      <option value="resuelto">Resuelto</option>
                    </select>
                    <button type="submit" class="boton">Guardar</button>
                  </form>
                </div>
              </details>
            </li>
          }
        </ul>
      }
    </section>
  `,
  styles: `
    @use 'panel';
    .panel { padding: 14px 16px; display: flex; flex-direction: column; gap: 12px; background: #0f1f4a; box-shadow: inset 4px 0 0 var(--fd-amber-400); }
    .fila { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; }
    .acciones { display: flex; align-items: center; gap: 12px; }
    .enlace-boton { background: none; border: none; cursor: pointer; color: var(--fd-blue-300); font: inherit; font-size: 13px; font-weight: 600; }
    .lista { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
    details { background: var(--fd-navy-700); }
    summary {
      padding: 10px 12px;
      display: grid; grid-template-columns: 130px 180px minmax(0, 1fr) auto; gap: 12px; align-items: center;
      cursor: pointer; list-style: none; font-size: 14px;
      &::-webkit-details-marker { display: none; }
    }
    .tipo { font-weight: 700; }
    .desc { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .resuelto { opacity: 0.7; }
    .seguimiento { padding: 0 12px 12px; display: flex; flex-direction: column; gap: 10px; }
    .notas { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; font-size: 14px; }
    .actualizar { display: flex; flex-wrap: wrap; gap: 8px; }
    .actualizar input, .actualizar select {
      min-height: 40px; padding: 0 10px; border: none; border-radius: 0;
      background: var(--fd-blue-50); color: var(--fd-navy-900); font: inherit; font-size: 14px;
    }
    .actualizar input { flex: 1 1 220px; }
    @media (max-width: 760px) {
      summary { grid-template-columns: auto minmax(0, 1fr); }
      summary .tipo, summary .sutil { display: none; }
    }
  `,
})
export class PanelConflictos {
  private readonly api = inject(AdminApi);
  /** Diálogo para el botón "Nuevo conflicto". */
  readonly dialogo = input.required<DialogoConflicto>();

  private readonly todos = toSignal(this.api.conflictos(), { initialValue: [] as Conflicto[] });
  protected readonly activos = computed(() => this.todos().filter((c) => c.estado !== 'resuelto'));
  protected readonly resueltos = computed(() => this.todos().length - this.activos().length);
  protected readonly verResueltos = signal(false);
  protected readonly visibles = computed(() => (this.verResueltos() ? this.todos() : this.activos()));

  protected readonly textoEstado = TEXTO_ESTADO_CONFLICTO;
  protected readonly codigo = (numero: number) => codigoPedido({ numero });
  protected readonly fecha = (d: Date) => FECHA.format(d);
  protected readonly tipo = (t: TipoConflicto) => TIPOS_CONFLICTO.find((x) => x.id === t)?.etiqueta ?? t;

  protected nuevo(): void {
    this.dialogo().abrir();
  }

  protected actualizar(c: Conflicto, nota: string, estado: string): void {
    this.api.actualizarConflicto(c.id, { nota, estado: estado as EstadoConflicto }).subscribe();
  }
}
