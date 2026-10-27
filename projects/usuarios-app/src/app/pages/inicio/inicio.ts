import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BarraEstado, PesosPipe, UsuariosApi, ZONAS, ZonaId, codigoPedido, nombreZona } from '@freedeli/shared';
import { UsuarioStore } from '../../core/usuario.store';
import { fechaRelativa } from '../../core/fechas';
import { AvisoHorario } from '../../ui/aviso-horario';

@Component({
  selector: 'fd-inicio',
  imports: [RouterLink, BarraEstado, PesosPipe, FormsModule, AvisoHorario],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export default class Inicio {
  private readonly api = inject(UsuariosApi);
  protected readonly store = inject(UsuarioStore);

  protected readonly kioscosAbiertos = toSignal(this.api.kioscosAbiertos());
  protected readonly recientes = toSignal(this.api.recientes(3), { initialValue: [] });

  protected readonly zonas = ZONAS;
  protected readonly zona = nombreZona;
  protected readonly codigo = codigoPedido;
  protected readonly fecha = fechaRelativa;

  protected readonly textoPedir = computed(() => {
    if (this.store.pedidoEnCurso()) return 'Tenés un pedido en curso';
    const n = this.kioscosAbiertos()?.length;
    if (n === undefined) return 'Buscando kioscos abiertos…';
    if (n === 0) return 'No hay kioscos abiertos ahora';
    return n === 1 ? '1 kiosco abierto ahora' : `${n} kioscos abiertos ahora`;
  });

  /** Con un pedido en curso, PEDIR lleva al seguimiento: es un pedido a la vez. */
  protected readonly destinoPedir = computed(() => {
    const p = this.store.pedidoEnCurso();
    return p ? ['/pedido', p.id] : ['/pedir'];
  });

  // ---- Cambiar dirección ----
  protected readonly editando = signal(false);
  protected direccion = '';
  protected notas = '';
  protected zonaElegida: ZonaId = 'san-miguel';
  protected readonly errorDireccion = signal(false);

  protected editarDireccion(): void {
    const d = this.store.usuario()?.direccion;
    if (!d) return;
    this.direccion = d.direccion;
    this.notas = d.notas ?? '';
    this.zonaElegida = d.zona;
    this.errorDireccion.set(false);
    this.editando.set(true);
  }

  protected async guardarDireccion(): Promise<void> {
    if (!/\d/.test(this.direccion) || this.direccion.trim().length < 4) {
      this.errorDireccion.set(true);
      return;
    }
    const ok = await this.store.cambiarDireccion({
      direccion: this.direccion.trim(),
      notas: this.notas.trim() || undefined,
      zona: this.zonaElegida,
    });
    if (ok) this.editando.set(false);
  }
}
