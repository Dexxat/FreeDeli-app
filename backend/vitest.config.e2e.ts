import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['test/db-global.ts'],
    testTimeout: 30_000,
    hookTimeout: 120_000,
    // Comparten la misma base: un archivo por vez.
    fileParallelism: false,
  },
});
