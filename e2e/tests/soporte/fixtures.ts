import { Browser, Locator, Page, expect, test as base } from '@playwright/test';
import { APPS } from '../../entorno/config.mjs';
import { Api } from './api.js';
import { limpiar } from './db.js';

export type App = 'usuarios' | 'kioscos' | 'riders' | 'dev';

const TAMANIO: Record<App, { width: number; height: number }> = {
  usuarios: { width: 390, height: 844 }, // teléfono
  riders: { width: 390, height: 844 }, // teléfono
  kioscos: { width: 1180, height: 820 }, // tablet apaisada
  dev: { width: 1280, height: 900 }, // escritorio
};

export function urlApp(app: App): string {
  return `http://localhost:${APPS.find((a) => a.nombre === app)!.puerto}`;
}

interface Problema {
  app: App;
  texto: string;
}

/**
 * Abre una app en su propio contexto (sesión y almacenamiento separados), como un dispositivo distinto.
 * Registra errores de JavaScript, errores de consola y respuestas 5xx de la API: la prueba falla si aparecen.
 */
async function abrirApp(browser: Browser, app: App, problemas: Problema[]): Promise<Page> {
  const contexto = await browser.newContext({ viewport: TAMANIO[app] });
  const page = await contexto.newPage();
  page.on('pageerror', (e) => problemas.push({ app, texto: `error JS: ${e.message}` }));
  page.on('console', (m) => {
    // Los 4xx que provocamos a propósito los loguea Chrome como "Failed to load resource"; los 5xx se controlan abajo.
    if (m.type() === 'error' && !m.text().startsWith('Failed to load resource')) problemas.push({ app, texto: `consola: ${m.text()}` });
  });
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 500) problemas.push({ app, texto: `API ${r.status()} en ${r.request().method()} ${r.url()}` });
  });
  page.on('dialog', (d) => void d.accept());
  await page.goto(urlApp(app));
  return page;
}

export const test = base.extend<{ api: Api; abrir: (app: App) => Promise<Page>; _limpieza: void }>({
  // Antes de cada prueba: sin riders conectados ni pedidos abiertos de pruebas anteriores.
  _limpieza: [
    async ({}, use) => {
      await limpiar();
      await use();
      await limpiar();
    },
    { auto: true },
  ],
  api: async ({}, use) => {
    const api = await Api.crear();
    await use(api);
    await api.cerrar();
  },
  abrir: async ({ browser }, use) => {
    const problemas: Problema[] = [];
    const paginas: Page[] = [];
    await use(async (app) => {
      const p = await abrirApp(browser, app, problemas);
      paginas.push(p);
      return p;
    });
    for (const p of paginas) await p.context().close();
    expect(problemas, 'errores en el navegador o en la API').toEqual([]);
  },
});

export { expect };

/** Ingresa desde la pantalla de login compartida por las cuatro apps. */
export async function ingresar(page: Page, email: string, clave: string, destino: RegExp): Promise<void> {
  await page.waitForURL(/\/ingresar$/);
  await page.locator('input[name=email]').fill(email);
  await page.locator('input[name=clave]').fill(clave);
  await page.getByRole('button', { name: 'INGRESAR' }).click();
  await page.waitForURL(destino);
}

/** Botón por su texto visible exacto, en la página o dentro de una parte de ella. */
export function boton(donde: Page | Locator, texto: string | RegExp) {
  return donde.getByRole('button', { name: texto, exact: typeof texto === 'string' });
}
