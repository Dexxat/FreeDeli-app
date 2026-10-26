import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'resumen' },
  { path: 'resumen', title: 'FreeDeli Dev · Resumen', loadComponent: () => import('./pages/resumen/resumen') },
  { path: 'kioscos', title: 'FreeDeli Dev · Kioscos', loadComponent: () => import('./pages/kioscos/kioscos') },
  { path: 'kioscos/:kioscoId', title: 'FreeDeli Dev · Kiosco', loadComponent: () => import('./pages/kiosco/kiosco') },
  { path: 'riders', title: 'FreeDeli Dev · Riders', loadComponent: () => import('./pages/riders/riders') },
  { path: 'ganancias', title: 'FreeDeli Dev · Ganancias', loadComponent: () => import('./pages/ganancias/ganancias') },
  { path: 'conflictos', title: 'FreeDeli Dev · Conflictos', loadComponent: () => import('./pages/conflictos/conflictos') },
  { path: '**', redirectTo: 'resumen' },
];
