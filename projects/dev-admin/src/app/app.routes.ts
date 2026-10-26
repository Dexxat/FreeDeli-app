import { Routes } from '@angular/router';
import { requiereSesion, soloSinSesion } from '@freedeli/shared';

export const routes: Routes = [
  {
    path: 'ingresar',
    title: 'FreeDeli Dev · Ingresar',
    canActivate: [soloSinSesion('/main')],
    data: { sinShell: true },
    loadComponent: () => import('./pages/ingresar/ingresar'),
  },
  {
    path: '',
    canActivateChild: [requiereSesion('DEV')],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'main' },
      { path: 'main', title: 'FreeDeli Dev · Main', loadComponent: () => import('./pages/main/main') },
      { path: 'ganancias', title: 'FreeDeli Dev · Ganancias', loadComponent: () => import('./pages/ganancias/ganancias') },
      { path: 'entregas', title: 'FreeDeli Dev · Entregas', loadComponent: () => import('./pages/entregas/entregas') },
      { path: 'kioscos', title: 'FreeDeli Dev · Kioscos', loadComponent: () => import('./pages/kioscos/kioscos') },
      { path: 'kioscos/:kioscoId', title: 'FreeDeli Dev · Kiosco', loadComponent: () => import('./pages/kiosco/kiosco') },
      { path: 'riders/:riderId', title: 'FreeDeli Dev · Rider', loadComponent: () => import('./pages/rider/rider') },
    ],
  },
  { path: '**', redirectTo: 'main' },
];
