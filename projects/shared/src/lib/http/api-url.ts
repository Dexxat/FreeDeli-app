import { InjectionToken } from '@angular/core';

/** URL base de la API, por ejemplo http://localhost:3000/api. Si no está, la app usa los mocks. */
export const API_URL = new InjectionToken<string>('API_URL');
