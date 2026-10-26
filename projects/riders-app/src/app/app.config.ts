import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { provideFreeDeliApi, provideFreeDeliMocks } from '@freedeli/shared';
import { environment } from '../environments/environment';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    // Con apiUrl usa la API real; sin ella, datos simulados (la persona maneja al rider; el kiosco es simulado).
    environment.apiUrl ? provideFreeDeliApi({ url: environment.apiUrl }) : provideFreeDeliMocks({ simular: { kiosco: true } }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
