import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { UsuariosApi } from '../api/usuarios.api.js';
import { API_URL } from './api-url';
import { HttpUsuariosApi } from './http-usuarios.api';
import { sesionInterceptor } from './interceptor';

/** Conecta las APIs a la API real. Se usa en lugar de provideFreeDeliMocks(). */
export function provideFreeDeliApi(opciones: { url: string }): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideHttpClient(withInterceptors([sesionInterceptor])),
    { provide: API_URL, useValue: opciones.url.replace(/\/$/, '') },
    { provide: UsuariosApi, useClass: HttpUsuariosApi },
  ]);
}
