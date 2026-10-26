import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'FreeDeli Kioscos · En vivo', loadComponent: () => import('./pages/inicio/inicio') },
  { path: 'ganancias', title: 'FreeDeli Kioscos · Ganancias', loadComponent: () => import('./pages/ganancias/ganancias') },
  { path: 'pedidos', title: 'FreeDeli Kioscos · Pedidos', loadComponent: () => import('./pages/pedidos/pedidos') },
  { path: 'ajustes', title: 'FreeDeli Kioscos · Ajustes', loadComponent: () => import('./pages/ajustes/ajustes') },
  { path: '**', redirectTo: 'inicio' },
];
