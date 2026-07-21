import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

/**
 * Serves the captured ad cards with the real enhancer running against them.
 *
 *   npm run harness
 *
 * It answers the question unit tests cannot, does the badge actually look
 * right, and does it land where it should, without needing a live leboncoin
 * page, an installed extension, or a login. See tools/harness/entry.ts.
 */
export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  resolve: {
    alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
  },
  server: { port: 5177, strictPort: true },
  build: {
    outDir: fileURLToPath(new URL('../../.output/harness', import.meta.url)),
    emptyOutDir: true,
    minify: false,
  },
});
