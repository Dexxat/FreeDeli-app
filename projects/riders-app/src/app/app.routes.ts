import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'inicio' },
  { path: 'inicio', title: 'FreeDeli Riders · Inicio', loadComponent: () => import('./pages/inicio/inicio') },
  { path: 'vivo', title: 'FreeDeli Riders · Pedido en curso', loadComponent: () => import('./pages/vivo/vivo') },
  { path: 'historial', title: 'FreeDeli Riders · Historial', loadComponent: () => import('./pages/historial/historial') },
  { path: 'ganancias', title: 'FreeDeli Riders · Ganancias', loadComponent: () => import('./pages/ganancias/ganancias') },
  { path: 'perfil', title: 'FreeDeli Riders · Perfil', loadComponent: () => import('./pages/perfil/perfil') },
  { path: '**', redirectTo: 'inicio' },
];
