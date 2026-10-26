import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideFreeDeliApi, provideFreeDeliMocks } from '@freedeli/shared';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Con apiUrl usa la API real; sin ella, todo simulado para ver la plataforma en movimiento.
    environment.apiUrl
      ? provideFreeDeliApi({ url: environment.apiUrl })
      : provideFreeDeliMocks({ simular: { cliente: true, kiosco: true, rider: true, pedidosNuevos: true } }),
  ],
};
