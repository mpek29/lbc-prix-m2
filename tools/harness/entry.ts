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
 * it touches an extension API, which is itself worth knowing.
 */
import { createEnhancer } from '@/app/create-enhancer';
import type { Logger } from '@/platform/logger';
import { fixture, fixtureList } from '@/site/leboncoin/__fixtures__/load';

const results = document.querySelector('#results');
const menu = document.querySelector('#sort-menu');
if (!results || !menu) throw new Error('harness: mount points missing');

// The sort menu is rendered on demand on the real site. Here it is always open,
// which is the state worth looking at.
menu.innerHTML = fixture('sort-radiogroup');

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

// `?sort=asc` picks that option on load, so a screenshot can capture the sorted
// state without anyone clicking. There is no leboncoin to page through here, so
// it sorts the cards on screen and says so.
const wanted = new URLSearchParams(location.search).get('sort');
if (wanted === 'asc' || wanted === 'desc') {
  const index = wanted === 'asc' ? 0 : 1;
  document
    .querySelectorAll('[data-lbc-prix-m2-sort]')
    [index]?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}
