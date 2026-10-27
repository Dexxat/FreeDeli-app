import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { API_URL, FREEDELI_CONFIG, KioscosApi, Producto, PesosPipe, SesionService, TEXTO_MOVIMIENTO } from '@freedeli/shared';
import { Observable } from 'rxjs';

const FECHA = new Intl.DateTimeFormat('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

@Component({
  selector: 'fd-ajustes',
  imports: [FormsModule, PesosPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ajustes.html',
  styleUrl: './ajustes.scss',
})
export default class Ajustes {
  protected readonly textoMovimiento = TEXTO_MOVIMIENTO;
  private readonly api = inject(KioscosApi);
  private readonly aliasConfig = inject(FREEDELI_CONFIG).aliasFreeDeli;
  private readonly sesion = inject(SesionService);
  private readonly router = inject(Router);
  protected readonly conApi = !!inject(API_URL, { optional: true });

  protected readonly kiosco = toSignal(this.api.kiosco());
  /** Con la API, el alias lo informa el servidor. */
  protected readonly aliasFreeDeli = computed(() => (this.kiosco() as { aliasFreeDeli?: string } | undefined)?.aliasFreeDeli ?? this.aliasConfig);
  protected readonly saldo = toSignal(this.api.movimientosSaldo(), { initialValue: [] });
  protected readonly catalogo = toSignal(this.api.catalogo(), { initialValue: [] as Producto[] });

  // ---- Datos ----
  protected datos = { nombre: '', direccion: '', aliasCobro: '', tiempoEstimadoMin: 25 };
  protected readonly datosMensaje = signal<{ ok: boolean; texto: string } | null>(null);

  // ---- Catálogo ----
  protected nuevo = { nombre: '', precio: 0 };
  protected readonly catalogoError = signal<string | null>(null);
  protected readonly copiado = signal(false);

  protected readonly fecha = (d: Date) => FECHA.format(d);

  constructor() {
    // Carga el formulario una vez, cuando llega el kiosco.
    let cargado = false;
    effect(() => {
      const k = this.kiosco();
      if (k && !cargado) {
        cargado = true;
        this.datos = { nombre: k.nombre, direccion: k.direccion, aliasCobro: k.aliasCobro, tiempoEstimadoMin: k.tiempoEstimadoMin };
      }
    });
  }

  private ejecutar<T>(llamada: Observable<T>, alTerminar: (error?: string) => void): void {
    llamada.subscribe({ next: () => alTerminar(), error: (e: Error) => alTerminar(e.message) });
  }

  protected guardarDatos(): void {
    this.datosMensaje.set(null);
    this.ejecutar(this.api.actualizarDatos({ ...this.datos, tiempoEstimadoMin: Number(this.datos.tiempoEstimadoMin) }), (error) =>
      this.datosMensaje.set(error ? { ok: false, texto: error } : { ok: true, texto: 'Datos guardados.' }),
    );
  }

  protected guardarProducto(p: Producto, cambios: Partial<Producto>): void {
    this.catalogoError.set(null);
    this.ejecutar(this.api.guardarProducto({ ...p, ...cambios }), (error) => error && this.catalogoError.set(error));
  }

  protected cambiarPrecio(p: Producto, valor: string): void {
    const precio = Number(valor.replace(/\D/g, ''));
    if (precio !== p.precio) this.guardarProducto(p, { precio });
  }

  protected agregarProducto(): void {
    this.catalogoError.set(null);
    this.ejecutar(this.api.guardarProducto({ nombre: this.nuevo.nombre, precio: Number(this.nuevo.precio), disponible: true }), (error) => {
      if (error) this.catalogoError.set(error);
      else this.nuevo = { nombre: '', precio: 0 };
    });
  }

  protected salir(): void {
    this.sesion.cerrar();
    void this.router.navigateByUrl('/ingresar');
  }

  protected async copiarAlias(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.aliasFreeDeli());
      this.copiado.set(true);
      setTimeout(() => this.copiado.set(false), 2500);
    } catch {
      this.copiado.set(false);
    }
  }
}
