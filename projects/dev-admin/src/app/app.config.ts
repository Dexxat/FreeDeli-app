import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideFreeDeliMocks } from '@freedeli/shared';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Todo simulado, para ver la plataforma en movimiento.
    provideFreeDeliMocks({ simular: { cliente: true, kiosco: true, rider: true, pedidosNuevos: true } }),
  ],
};
