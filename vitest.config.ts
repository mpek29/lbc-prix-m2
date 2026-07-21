import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

export default defineConfig({
  // WxtVitest wires up the `#imports` alias, the `@/` path alias and an
  // in-memory fake of the extension APIs, so tests import exactly what the
  // production code imports.
  plugins: [WxtVitest()],
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/entrypoints/**', 'src/**/types.ts'],
      // The domain layer is pure and cheap to cover; hold it to a high bar and
      // let the glue code be covered by the layers above it.
      thresholds: {
        'src/core/**/*.ts': {
          statements: 95,
          branches: 90,
          functions: 95,
          lines: 95,
        },
      },
    },
  },
});
