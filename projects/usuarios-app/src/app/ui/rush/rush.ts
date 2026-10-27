import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { MINUTOS_PARA_ESTRELLA } from '@freedeli/shared';
import { MS_POR_PASO } from './motor';
import { formatoRacha } from './racha';
import { MS_PARA_ESTRELLA, cortarRacha, pasoDeSesion, saltarEnSesion, sesionInicial } from './sesion';

const CLAVE_MEJOR = 'freedeli-rush-mejor';

function leerMejor(): number {
  try {
    return Number(localStorage.getItem(CLAVE_MEJOR)) || 0;
  } catch {
    return 0;
  }
}

function guardarMejor(puntos: number): void {
  try {
    localStorage.setItem(CLAVE_MEJOR, String(puntos));
  } catch {
    // Sin almacenamiento (modo privado): el récord dura lo que la pantalla.
  }
}

/** FREEDELI RUSH: el juego para esperar al rider. Avisa cuando el cliente jugó 10 minutos seguidos. */
@Component({
  selector: 'fd-rush',
  imports: [DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './rush.html',
  styleUrl: './rush.scss',
  host: { '(document:visibilitychange)': 'alCambiarVisibilidad()' },
})
export class Rush {
  /** Si todavía puede ganar la estrella de este pedido. */
  readonly estrellaDisponible = input(true);
  /** Jugó 10 minutos seguidos. Se emite una sola vez. */
  readonly estrella = output<void>();

  private readonly sesion = signal(sesionInicial());
  protected readonly juego = computed(() => this.sesion().juego);
  protected readonly mejor = signal(leerMejor());

  protected readonly puntos = computed(() => String(this.juego().puntos).padStart(5, '0'));
  protected readonly textoMejor = computed(() => String(this.mejor()).padStart(5, '0'));
  protected readonly textoRacha = computed(() => formatoRacha(Math.min(this.sesion().racha.ms, MS_PARA_ESTRELLA)));
  protected readonly progreso = computed(() => Math.min(100, (this.sesion().racha.ms / MS_PARA_ESTRELLA) * 100));
  protected readonly minutos = MINUTOS_PARA_ESTRELLA;

  constructor() {
    const id = setInterval(() => this.avanzar(), MS_POR_PASO);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
  }

  protected saltar(): void {
    this.sesion.update(saltarEnSesion);
  }

  protected alCambiarVisibilidad(): void {
    if (document.hidden) this.sesion.update(cortarRacha);
  }

  private avanzar(): void {
    const antes = this.sesion();
    if (antes.juego.modo !== 'jugando' && antes.racha.ms === 0) return;
    const { sesion, ganoEstrella } = pasoDeSesion(antes, Date.now(), this.estrellaDisponible());
    this.sesion.set(sesion);
    if (sesion.juego.modo === 'choque' && antes.juego.modo === 'jugando' && sesion.juego.puntos > this.mejor()) {
      this.mejor.set(sesion.juego.puntos);
      guardarMejor(sesion.juego.puntos);
    }
    if (ganoEstrella) this.estrella.emit();
  }
}
