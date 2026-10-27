import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidatorFn } from '@angular/forms';
import { Router } from '@angular/router';
import {
  CampoFoto,
  DocumentosRider,
  FREEDELI_CONFIG,
  PedidosApi,
  RidersApi,
  TIPOS_DOCUMENTO,
  TipoDocumento,
  mensajeDeError,
  aliasCbuValido,
  celularValido,
  dniValido,
  emailValido,
  linkWhatsApp,
  nombreCompletoValido,
  normalizarPatente,
  patenteValida,
} from '@freedeli/shared';
import { RiderStore } from '../../core/rider.store';

type Seccion = 'datos' | 'vehiculo';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function regla(valida: (v: string) => boolean, clave: string): ValidatorFn {
  return (c: AbstractControl) => (valida(String(c.value ?? '')) ? null : { [clave]: true });
}

@Component({
  selector: 'fd-perfil',
  imports: [ReactiveFormsModule, CampoFoto],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './perfil.html',
  styleUrl: './perfil.scss',
})
export default class Perfil {
  protected readonly store = inject(RiderStore);
  private readonly config = inject(FREEDELI_CONFIG);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly pedidoEnCurso = toSignal(inject(PedidosApi).enCursoDelRider());
  private readonly api = inject(RidersApi);

  protected readonly tiposDocumento = TIPOS_DOCUMENTO;
  protected readonly documentos = signal<DocumentosRider | null>(null);
  protected readonly errorDocumento = signal<string | null>(null);

  protected readonly editando = signal<Seccion | null>(null);
  protected readonly confirmarSalida = signal(false);
  protected readonly enviado = signal(false);

  protected readonly formDatos = this.fb.group({
    nombre: ['', regla(nombreCompletoValido, 'nombre')],
    dni: ['', regla(dniValido, 'dni')],
    telefono: ['', regla(celularValido, 'telefono')],
    email: ['', regla(emailValido, 'email')],
  });

  protected readonly formVehiculo = this.fb.group({
    modelo: ['', regla((v) => v.trim().length >= 2, 'modelo')],
    patente: ['', regla(patenteValida, 'patente')],
    aliasCbu: ['', regla(aliasCbuValido, 'aliasCbu')],
  });

  protected readonly riderDesde = computed(() => {
    const d = this.store.rider()?.riderDesde;
    return d ? `Rider desde ${MESES[d.getMonth()]} ${d.getFullYear()}` : '';
  });

  protected readonly whatsapp = computed(() =>
    linkWhatsApp(this.config.whatsapp, `Hola FreeDeli, soy ${this.store.rider()?.nombre ?? 'rider'}.`),
  );

  constructor() {
    this.api.documentos().subscribe((d) => this.documentos.set(d));
  }

  protected actualizarDocumento(tipo: TipoDocumento, imagen: string | null): void {
    if (!imagen) return;
    this.errorDocumento.set(null);
    this.api.actualizarDocumento(tipo, imagen).subscribe({
      next: (d) => this.documentos.set(d),
      error: (e: unknown) => this.errorDocumento.set(mensajeDeError(e, e instanceof Error ? e.message : undefined)),
    });
  }

  protected editar(seccion: Seccion): void {
    const r = this.store.rider();
    if (!r) return;
    this.enviado.set(false);
    if (seccion === 'datos') {
      this.formDatos.reset({ nombre: r.nombre, dni: r.dni, telefono: r.telefono, email: r.email });
    } else {
      this.formVehiculo.reset({ modelo: r.vehiculo.modelo, patente: r.vehiculo.patente, aliasCbu: r.cobro.aliasCbu });
    }
    this.editando.set(seccion);
  }

  protected cancelar(): void {
    this.editando.set(null);
  }

  protected async guardarDatos(): Promise<void> {
    this.enviado.set(true);
    if (this.formDatos.invalid) return;
    const { nombre, dni, telefono, email } = this.formDatos.getRawValue();
    if (await this.store.actualizarPerfil({ nombre: nombre.trim(), dni, telefono: telefono.trim(), email: email.trim() })) this.editando.set(null);
  }

  protected async guardarVehiculo(): Promise<void> {
    this.enviado.set(true);
    if (this.formVehiculo.invalid) return;
    const { modelo, patente, aliasCbu } = this.formVehiculo.getRawValue();
    const ok = await this.store.actualizarPerfil({
      vehiculo: { modelo: modelo.trim(), patente: normalizarPatente(patente) },
      cobro: { aliasCbu: aliasCbu.trim() },
    });
    if (ok) this.editando.set(null);
  }

  protected cambiarPreferencia(clave: 'notificaciones' | 'sonidos8bit', valor: boolean): void {
    const actuales = this.store.rider()?.preferencias;
    if (!actuales) return;
    void this.store.actualizarPerfil({ preferencias: { ...actuales, [clave]: valor } });
  }

  protected invalido(control: AbstractControl): boolean {
    return control.invalid && (control.touched || this.enviado());
  }

  protected pedirSalida(): void {
    this.confirmarSalida.set(true);
  }

  protected readonly puedeSalir = computed(() => !this.pedidoEnCurso());

  protected async cerrarSesion(): Promise<void> {
    await this.router.navigateByUrl(await this.store.cerrarSesion());
  }
}
