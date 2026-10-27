import { defineConfig, devices } from '@playwright/test';
import { APPS } from './entorno/config.mjs';

const CI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  // Todas las pruebas comparten la base y el despacho de ofertas a riders: una por vez.
  fullyParallel: false,
  workers: 1,
  retries: CI ? 1 : 0,
  forbidOnly: CI,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: CI ? [['list'], ['html', { open: 'never' }], ['github']] : [['list'], ['html', { open: 'never' }]],
  use: {
    // En la Mac usa el Chrome instalado; en CI, el Chromium de Playwright.
    ...devices['Desktop Chrome'],
    channel: CI ? undefined : 'chrome',
    locale: 'es-AR',
    timezoneId: 'America/Argentina/Buenos_Aires',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'node entorno/levantar.mjs',
    url: `http://localhost:${APPS[0].puerto}/api/salud`,
    timeout: 300_000,
    reuseExistingServer: !CI,
    stdout: process.env.E2E_LOGS ? 'pipe' : 'ignore',
    stderr: 'pipe',
  },
});
