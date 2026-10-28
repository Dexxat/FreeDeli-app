// Puertos y cuentas del entorno de pruebas. Distintos de los de desarrollo para no chocar.
export const PUERTO_API = 3100;
export const PUERTO_PG = 5440;
export const APPS = [
  { nombre: 'usuarios', proyecto: 'usuarios-app', puerto: 4400 },
  { nombre: 'kioscos', proyecto: 'kioscos-app', puerto: 4401 },
  { nombre: 'riders', proyecto: 'riders-app', puerto: 4402 },
  { nombre: 'dev', proyecto: 'dev-admin', puerto: 4403 },
];
/** Firma de las sesiones de la API de pruebas. */
export const JWT_SECRET = 'secreto-e2e';
export const DEV = { email: 'dev@e2e.local', clave: 'clave-dev-e2e' };
