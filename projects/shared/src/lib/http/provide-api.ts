import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { PedidosApi } from '../api/pedidos.api.js';
import { RidersApi } from '../api/riders.api.js';
import { UsuariosApi } from '../api/usuarios.api.js';
import { HttpPedidosApi } from './http-pedidos.api';
import { HttpRidersApi } from './http-riders.api';
import { API_URL } from './api-url';
import { HttpUsuariosApi } from './http-usuarios.api';
import { sesionInterceptor } from './interceptor';

/** Conecta las APIs a la API real. Se usa en lugar de provideFreeDeliMocks(). */
export function provideFreeDeliApi(opciones: { url: string }): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptors([sesionInterceptor])),
    { provide: API_URL, useValue: opciones.url.replace(/\/$/, '') },
    { provide: UsuariosApi, useClass: HttpUsuariosApi },
    { provide: RidersApi, useClass: HttpRidersApi },
    { provide: PedidosApi, useClass: HttpPedidosApi },
  ]);
}
