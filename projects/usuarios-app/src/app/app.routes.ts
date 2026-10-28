import { Routes } from '@angular/router';
import { requiereSesion, soloSinSesion } from '@freedeli/shared';
import type { DatosShell } from './app';

export const routes: Routes = [
  {
    path: 'ingresar',
    title: 'FreeDeli · Ingresar',
    canActivate: [soloSinSesion('/inicio')],
    data: { sinNav: true, sinHeader: true } satisfies DatosShell,
    loadComponent: () => import('./pages/ingresar/ingresar'),
  },
  {
    path: 'registro',
    title: 'FreeDeli · Crear cuenta',
    canActivate: [soloSinSesion('/inicio')],
    data: { sinNav: true, sinHeader: true } satisfies DatosShell,
    loadComponent: () => import('./pages/registro/registro'),
  },
  {
    path: 'recuperar',
    title: 'FreeDeli · Recuperar contraseña',
    canActivate: [soloSinSesion('/inicio')],
    data: { sinNav: true, sinHeader: true } satisfies DatosShell,
    loadComponent: () => import('./pages/recuperar/recuperar'),
  },
  {
    // Sin guard: el link del mail tiene que funcionar aunque haya otra sesión abierta en el celular.
    path: 'restablecer',
    title: 'FreeDeli · Contraseña nueva',
    data: { sinNav: true, sinHeader: true } satisfies DatosShell,
    loadComponent: () => import('./pages/restablecer/restablecer'),
  },
  {
    path: '',
    canActivateChild: [requiereSesion('USUARIO')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', title: 'FreeDeli', loadComponent: () => import('./pages/inicio/inicio') },
      {
        path: 'pedir',
        title: 'FreeDeli · Kioscos abiertos',
        data: { volver: '/inicio' } satisfies DatosShell,
        loadComponent: () => import('./pages/kioscos/kioscos'),
      },
      {
        path: 'pedir/:kioscoId',
        title: 'FreeDeli · Armar pedido',
        data: { volver: '/pedir', sinNav: true } satisfies DatosShell,
        loadComponent: () => import('./pages/kiosco/kiosco'),
      },
      {
        path: 'pedido/:pedidoId/realizado',
        title: 'FreeDeli · Pedido realizado',
        loadComponent: () => import('./pages/realizado/realizado'),
      },
      {
        path: 'pedido',
        title: 'FreeDeli · Mi pedido',
        loadComponent: () => import('./pages/seguimiento/seguimiento'),
      },
      {
        path: 'pedido/:pedidoId',
        title: 'FreeDeli · Mi pedido',
        loadComponent: () => import('./pages/seguimiento/seguimiento'),
      },
      {
        path: 'ajustes',
        title: 'FreeDeli · Ajustes',
        loadComponent: () => import('./pages/ajustes/ajustes'),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' },
];
