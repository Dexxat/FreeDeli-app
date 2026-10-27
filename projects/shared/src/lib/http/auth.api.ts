import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, tap } from 'rxjs';
import { ZonaId } from '../models/zona.js';
import { API_URL } from './api-url';
import { Cuenta, RespuestaSesion, SesionService } from './sesion';

export interface RegistroUsuario {
  email: string;
  clave: string;
  /** Nombre y apellido. */
  nombre: string;
  dni: string;
  telefono: string;
  direccion: string;
  notas?: string;
  zona: ZonaId;
}

export interface RegistroKiosco {
  email: string;
  clave: string;
  nombre: string;
  direccion: string;
  zona: ZonaId;
  aliasCobro: string;
}

export interface RegistroRider {
  email: string;
  clave: string;
  nombre: string;
  telefono: string;
  dni: string;
  vehiculoModelo: string;
  patente: string;
  aliasCbu: string;
  /** Fotos del seguro y la licencia, comprimidas (data URL). */
  seguro: string;
  licencia: string;
}

/** Registro e ingreso. Al responder, guarda la sesión. */
@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly url = inject(API_URL);
  private readonly sesion = inject(SesionService);

  private guardar = (r: RespuestaSesion) => this.sesion.iniciar(r);

  ingresar(email: string, clave: string): Observable<RespuestaSesion> {
    return this.http.post<RespuestaSesion>(`${this.url}/auth/ingresar`, { email, clave }).pipe(tap(this.guardar));
  }

  registrarUsuario(datos: RegistroUsuario): Observable<RespuestaSesion> {
    return this.http.post<RespuestaSesion>(`${this.url}/auth/registro/usuario`, datos).pipe(tap(this.guardar));
  }

  registrarKiosco(datos: RegistroKiosco): Observable<RespuestaSesion> {
    return this.http.post<RespuestaSesion>(`${this.url}/auth/registro/kiosco`, datos).pipe(tap(this.guardar));
  }

  registrarRider(datos: RegistroRider): Observable<RespuestaSesion> {
    return this.http.post<RespuestaSesion>(`${this.url}/auth/registro/rider`, datos).pipe(tap(this.guardar));
  }

  /** Estado actual de la cuenta con un token nuevo (sirve para seguir cuando Dev la aprueba). */
  yo(): Observable<Cuenta> {
    return this.http.get<RespuestaSesion>(`${this.url}/auth/yo`).pipe(
      tap(this.guardar),
      map((r) => r.cuenta),
    );
  }
}

/** Mensaje de error de la API para mostrar al usuario. */
export function mensajeDeError(e: unknown, porDefecto = 'No se pudo completar. Probá de nuevo.'): string {
  const cuerpo = (e as { error?: { message?: string | string[] } })?.error;
  const m = cuerpo?.message;
  if (Array.isArray(m)) return m[0] ?? porDefecto;
  if (typeof m === 'string') return m;
  if ((e as { status?: number })?.status === 0) return 'Sin conexión con FreeDeli. Revisá tu internet.';
  return porDefecto;
}
