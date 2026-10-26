/**
 * Dominio de FreeDeli: modelos y reglas en TypeScript puro, sin Angular.
 * Lo usan las apps (a través de @freedeli/shared) y la API (backend/src/dominio.ts).
 * Los imports internos llevan extensión .js para que también funcionen en Node.
 */
export * from './models/index.js';
export * from './rules/index.js';
