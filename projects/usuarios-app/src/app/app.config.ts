import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideFreeDeliApi, provideFreeDeliMocks } from '@freedeli/shared';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    // Con apiUrl usa la API real; sin ella, datos simulados (kiosco y riders simulados).
    environment.apiUrl ? provideFreeDeliApi({ url: environment.apiUrl }) : provideFreeDeliMocks({ simular: { kiosco: true, rider: true } }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
