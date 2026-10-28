import { Routes } from '@angular/router';
import { requiereSesion, soloSinSesion } from '@freedeli/shared';

/** Rutas sin header ni navegación (ingreso, registro y espera de aprobación). */
export const SIN_SHELL = { sinShell: true };

export const routes: Routes = [
  {
    path: 'ingresar',
    title: 'FreeDeli Riders · Ingresar',
    canActivate: [soloSinSesion('/inicio')],
    data: SIN_SHELL,
    loadComponent: () => import('./pages/ingresar/ingresar'),
  },
  {
    path: 'registro',
    title: 'FreeDeli Riders · Alta',
    canActivate: [soloSinSesion('/inicio')],
    data: SIN_SHELL,
    loadComponent: () => import('./pages/registro/registro'),
  },
  {
    path: 'recuperar',
    title: 'FreeDeli Riders · Recuperar contraseña',
    canActivate: [soloSinSesion('/inicio')],
    data: SIN_SHELL,
    loadComponent: () => import('./pages/recuperar/recuperar'),
  },
  {
    // Sin guard: el link del mail tiene que funcionar aunque haya otra sesión abierta en el celular.
    path: 'restablecer',
    title: 'FreeDeli Riders · Contraseña nueva',
    data: SIN_SHELL,
    loadComponent: () => import('./pages/restablecer/restablecer'),
  },
  { path: 'pendiente', title: 'FreeDeli Riders · Alta en revisión', data: SIN_SHELL, loadComponent: () => import('./pages/pendiente/pendiente') },
  { path: 'sesion-cerrada', title: 'FreeDeli Riders', data: SIN_SHELL, loadComponent: () => import('./pages/sesion-cerrada/sesion-cerrada') },
  {
    path: '',
    canActivateChild: [requiereSesion('RIDER')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', title: 'FreeDeli Riders · Inicio', loadComponent: () => import('./pages/inicio/inicio') },
      { path: 'vivo', title: 'FreeDeli Riders · Pedido en curso', loadComponent: () => import('./pages/vivo/vivo') },
      { path: 'historial', title: 'FreeDeli Riders · Historial', loadComponent: () => import('./pages/historial/historial') },
      { path: 'ganancias', title: 'FreeDeli Riders · Ganancias', loadComponent: () => import('./pages/ganancias/ganancias') },
      { path: 'perfil', title: 'FreeDeli Riders · Perfil', loadComponent: () => import('./pages/perfil/perfil') },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
