import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { API_URL } from './api-url';
import { RolCuenta, SesionService } from './sesion';

/**
 * Exige sesión del rol indicado. Con los mocks (sin API_URL) deja pasar.
 * Una cuenta pendiente de aprobación va a /pendiente.
 */
export function requiereSesion(rol: RolCuenta): CanActivateFn {
  return () => {
    if (!inject(API_URL, { optional: true })) return true;
    const sesion = inject(SesionService);
    const router = inject(Router);
    const cuenta = sesion.cuenta();
    if (!cuenta || cuenta.rol !== rol) return router.parseUrl('/ingresar');
    if (cuenta.estado !== 'APROBADA') return router.parseUrl('/pendiente');
    return true;
  };
}

/** Para /ingresar y /registro: si ya hay sesión, va al inicio. */
export function soloSinSesion(destino = '/'): CanActivateFn {
  return () => (inject(SesionService).activa() ? inject(Router).parseUrl(destino) : true);
}
