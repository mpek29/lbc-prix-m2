/**
 * Mounts the captured ad cards and runs the real enhancer against them in a
 * real browser engine.
 *
 * happy-dom will happily tell you the badge is in the DOM. It will not tell you
 * that it is unreadable, or that it wrapped onto its own line, or that a
 * `prefers-color-scheme` branch never applied. This will, in about a second,
 * without a live leboncoin page or an installed extension.
 *
 * Everything below the entrypoints layer is reachable from here because none of
 * it touches an extension API — which is itself worth knowing.
 */
import { createEnhancer } from '@/app/create-enhancer';
import type { Logger } from '@/platform/logger';
import { fixtureList } from '@/site/leboncoin/__fixtures__/load';

const results = document.querySelector('#results');
if (!results) throw new Error('harness: #results missing');

results.innerHTML = fixtureList(
  'ad-card-rental',
  'ad-card-sale',
  'ad-card-no-area',
  'ad-card-no-price',
);

const logger: Logger = {
  debug: (...args) => console.debug('[harness]', ...args),
  warn: (...args) => console.warn('[harness]', ...args),
  error: (...args) => console.error('[harness]', ...args),
};

const harness = createEnhancer(document, logger);
harness.start();

// One enhancer, exposed so the console can drive it: `harness.stop()` must
// leave the page byte-identical to how leboncoin served it, and
// `harness.start()` must put it back.
Object.assign(window, { harness });
