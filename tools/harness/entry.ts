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

// `?pages=N` fakes a multi-page search on a slow connection, which is the only
// way to see the loading state: with real fixtures everything is already here
// and the sort finishes before a screenshot can catch it.
const fakePages = Number(new URLSearchParams(location.search).get('pages') ?? 0);
// A tiny page size so a handful of fixtures still produces several pages to
// walk and several to read.
const perPage = Number(new URLSearchParams(location.search).get('perpage') ?? 4);
if (fakePages > 1) {
  const totals = {
    props: {
      // A tiny page size so a handful of fixtures still produces several pages
      // to walk and several to read.
      pageProps: {
        searchData: { total: fakePages * perPage, max_pages: 100 },
        search: { limit: perPage },
      },
    },
  };
  const blob = document.createElement('script');
  blob.id = '__NEXT_DATA__';
  blob.type = 'application/json';
  blob.textContent = JSON.stringify(totals);
  document.body.append(blob);

  // Something for the extension to put away while its own pager is in charge.
  document.body.insertAdjacentHTML(
    'beforeend',
    '<nav class="menu" style="text-align:center">leboncoin: <a href="?page=2">2</a> <a href="?page=3">3</a></nav>',
  );

  // Each fetched page carries ads the previous ones did not, or the walk stops
  // on the first duplicate and there is nothing to page through.
  let served = 0;
  window.fetch = () =>
    new Promise((resolve) =>
      setTimeout(() => {
        served += 1;
        const html = fixtureList('ad-card-sale', 'ad-card-rental').replaceAll(
          /\/ad\/[a-z_]+\/(\d+)/g,
          (match) => `${match}${served}`,
        );
        resolve(new Response(`<html><body>${html}</body></html>`, { status: 200 }));
      }, 250),
    );
}

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
