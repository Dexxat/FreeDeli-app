import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { API_URL } from './api-url';
import { SesionService } from './sesion';

/** Agrega el token a las llamadas a la API y, si vence, cierra la sesión y lleva al ingreso. */
export const sesionInterceptor: HttpInterceptorFn = (req, next) => {
  const url = inject(API_URL, { optional: true });
  const sesion = inject(SesionService);
  const router = inject(Router);
  if (!url || !req.url.startsWith(url)) return next(req);
  const token = sesion.token();
  const conToken = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;
  return next(conToken).pipe(
    catchError((e: HttpErrorResponse) => {
      if (e.status === 401 && token) {
        sesion.cerrar();
        void router.navigateByUrl('/ingresar');
      }
      return throwError(() => e);
    }),
  );
};
