import { Routes } from '@angular/router';
import { requiereSesion, soloSinSesion } from '@freedeli/shared';

/** Rutas sin menú (ingreso, alta y espera de aprobación). */
const SIN_SHELL = { sinShell: true };

export const routes: Routes = [
  {
    path: 'ingresar',
    title: 'FreeDeli Kioscos · Ingresar',
    canActivate: [soloSinSesion('/inicio')],
    data: SIN_SHELL,
    loadComponent: () => import('./pages/ingresar/ingresar'),
  },
  {
    path: 'registro',
    title: 'FreeDeli Kioscos · Alta',
    canActivate: [soloSinSesion('/inicio')],
    data: SIN_SHELL,
    loadComponent: () => import('./pages/registro/registro'),
  },
  {
    path: 'recuperar',
    title: 'FreeDeli Kioscos · Recuperar contraseña',
    canActivate: [soloSinSesion('/inicio')],
    data: SIN_SHELL,
    loadComponent: () => import('./pages/recuperar/recuperar'),
  },
  {
    // Sin guard: el link del mail tiene que funcionar aunque haya otra sesión abierta en el celular.
    path: 'restablecer',
    title: 'FreeDeli Kioscos · Contraseña nueva',
    data: SIN_SHELL,
    loadComponent: () => import('./pages/restablecer/restablecer'),
  },
  { path: 'pendiente', title: 'FreeDeli Kioscos · Alta en revisión', data: SIN_SHELL, loadComponent: () => import('./pages/pendiente/pendiente') },
  {
    path: '',
    canActivateChild: [requiereSesion('KIOSCO')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', title: 'FreeDeli Kioscos · En vivo', loadComponent: () => import('./pages/inicio/inicio') },
      { path: 'ganancias', title: 'FreeDeli Kioscos · Ganancias', loadComponent: () => import('./pages/ganancias/ganancias') },
      { path: 'pedidos', title: 'FreeDeli Kioscos · Pedidos', loadComponent: () => import('./pages/pedidos/pedidos') },
      { path: 'ajustes', title: 'FreeDeli Kioscos · Ajustes', loadComponent: () => import('./pages/ajustes/ajustes') },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
