import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@/platform/logger';
import { fixture, fixtureList } from '@/site/leboncoin/__fixtures__/load';
import { findSortRadioGroup } from '@/site/leboncoin/sort-control';
import { findSortOptions } from '@/ui/sort-option';
import { createAreaSorter } from './sort-by-area';

const logger: Logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/** A results page: the sort menu open, a list of ads, and the totals blob. */
function renderSearchPage(nextData?: unknown) {
  document.body.innerHTML = `
    ${fixture('sort-radiogroup')}
    ${fixtureList('ad-card-rental', 'ad-card-sale', 'ad-card-no-area')}
    ${
      nextData === undefined
        ? ''
        : `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`
    }`;
}

const pageOf = (total: number) => ({
  props: { pageProps: { searchData: { total, max_pages: 100 }, search: { limit: 35 } } },
});

const openMenu = () => findSortRadioGroup(document)!;
const optionLabels = () =>
  findSortOptions(document).map((row) => row.querySelector('label')?.textContent);
/**
 * The price sentence of each card, in list order.
 *
 * Not `li.querySelector('.sr-only')`: the rental card's first
 * screen-reader line is "Annonce déjà vue.", which is how the first draft of
 * this helper reported a correct sort as a failure.
 */
const listedPrices = () =>
  Array.from(document.querySelectorAll('li'), (li) =>
    Array.from(li.querySelectorAll('.sr-only'))
      .map((node) => node.textContent?.trim() ?? '')
      .find((text) => text.startsWith('Prix')),
  );

beforeEach(() => {
  renderSearchPage();
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('the sort menu', () => {
  it('gains the two options', () => {
    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();

    expect(optionLabels()).toEqual(['Prix/m² croissant', 'Prix/m² décroissant']);
  });

  it('puts them inside leboncoin’s own group, after their options', () => {
    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();

    const labels = Array.from(openMenu().querySelectorAll('label'), (l) => l.textContent);
    expect(labels).toEqual([
      'Pertinence',
      'Plus récentes',
      'Plus anciennes',
      'Prix croissants',
      'Prix décroissants',
      'Prix/m² croissant',
      'Prix/m² décroissant',
    ]);
  });

  it('does not add them twice when the menu re-renders', () => {
    const sorter = createAreaSorter(document, logger, { delayMs: 0 });

    sorter.syncMenu();
    sorter.syncMenu();

    expect(findSortOptions(document)).toHaveLength(2);
  });

  it('does nothing while the menu is closed', () => {
    document.body.innerHTML = fixtureList('ad-card-rental');

    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();

    expect(findSortOptions(document)).toHaveLength(0);
  });
});

describe('choosing an option', () => {
  it('reorders the ads by price per square metre', async () => {
    const sorter = createAreaSorter(document, logger, { delayMs: 0 });
    sorter.syncMenu();

    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    // 11,6 €/m² (640/55) before 1 945 €/m² (249 000/128), unpriceable last.
    expect(listedPrices()).toEqual(['Prix: 640 €.', 'Prix: 249 000 €.', 'Prix: 75 €.']);
    expect(sorter.active()).toBe('asc');
  });

  it('reverses for décroissant', async () => {
    const sorter = createAreaSorter(document, logger, { delayMs: 0 });
    sorter.syncMenu();

    findSortOptions(document)[1]?.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    expect(listedPrices()).toEqual(['Prix: 249 000 €.', 'Prix: 640 €.', 'Prix: 75 €.']);
    expect(sorter.active()).toBe('desc');
  });

  it('clears leboncoin’s selection, so the menu shows one chosen option', async () => {
    const sorter = createAreaSorter(document, logger, { delayMs: 0 });
    sorter.syncMenu();

    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    const native = document.querySelector('[value="relevance"]');
    expect(native?.getAttribute('aria-checked')).toBe('false');
    expect(
      findSortOptions(document)[0]?.querySelector('[role="radio"]')?.getAttribute('aria-checked'),
    ).toBe('true');
  });

  it('says what it sorted', async () => {
    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();

    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    expect(document.querySelector('[data-lbc-prix-m2-summary]')?.textContent).toContain(
      'Prix/m² croissant',
    );
  });
});

describe('when the search spans more pages than leboncoin will serve', () => {
  it('admits the sort is partial rather than implying it covered everything', async () => {
    // 217 762 rentals, 6 222 pages, and leboncoin stops at 100. No budget and
    // no patience gets past that, so the banner has to say so.
    renderSearchPage(pageOf(217_762));
    // A fresh Response per call: a body can only be read once.
    vi.mocked(fetch).mockImplementation(
      async () =>
        new Response(`<html><body>${fixtureList('ad-card-rental')}</body></html>`, { status: 200 }),
    );

    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    // The group separator ICU picks for fr-FR is U+202F, not a plain space, so
    // the text is normalised before comparing. Same reason as format.test.ts.
    const summary = () =>
      document.querySelector('[data-lbc-prix-m2-summary]')?.textContent?.replace(/\s/g, ' ') ?? '';

    await vi.waitFor(() => expect(summary()).toContain('217 762 résultats'));

    expect(summary()).toContain('ne permet pas');
    expect(summary()).not.toContain('de cette recherche');
  });

  it('reports a small search as complete', async () => {
    renderSearchPage(pageOf(3));

    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    expect(document.querySelector('[data-lbc-prix-m2-summary]')?.textContent).toContain(
      'de cette recherche',
    );
    // One page of results needs no requests at all.
    expect(fetch).not.toHaveBeenCalled();
  });

  it('never re-fetches page 1, which is already on screen', async () => {
    renderSearchPage(pageOf(105)); // 3 pages
    // A fresh Response per call: a body can only be read once.
    vi.mocked(fetch).mockImplementation(
      async () =>
        new Response(`<html><body>${fixtureList('ad-card-rental')}</body></html>`, { status: 200 }),
    );

    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(2));

    const urls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(urls.some((url) => url.includes('page=2'))).toBe(true);
    expect(urls.some((url) => url.includes('page=1'))).toBe(false);
  });
});

describe('while it is collecting', () => {
  const slowPage = () =>
    new Promise<Response>((resolve) =>
      setTimeout(
        () =>
          resolve(
            new Response(`<html><body>${fixtureList('ad-card-rental')}</body></html>`, {
              status: 200,
            }),
          ),
        20,
      ),
    );

  it('hides the stale order and shows how far along it is', async () => {
    // Without this the reader spends several seconds looking at leboncoin's
    // order in a list that looks finished, and reads it as the answer.
    renderSearchPage(pageOf(105)); // 3 pages
    vi.mocked(fetch).mockImplementation(slowPage);

    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    const list = document.querySelector('ul[data-lbc-prix-m2-busy]');
    expect(list).not.toBeNull();
    expect(document.querySelector('[role="progressbar"]')).not.toBeNull();
    expect(document.querySelector('[data-lbc-prix-m2-summary]')?.textContent).toContain(
      'page 1 sur 3',
    );

    await vi.waitFor(() => expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull());
  });

  it('shows the ads again and drops the bar when it finishes', async () => {
    renderSearchPage(pageOf(105));
    vi.mocked(fetch).mockImplementation(slowPage);

    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await vi.waitFor(() => expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull());

    expect(document.querySelector('[role="progressbar"]')).toBeNull();
    expect(document.querySelectorAll('li').length).toBeGreaterThan(0);
  });

  it('does not hide anything when there is nothing to fetch', () => {
    // A single page of results is already in the DOM, so there is no wait to
    // cover and a flash of hidden cards would be pure noise.
    renderSearchPage(pageOf(3));

    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull();
  });

  it('shows the ads again when the network fails', async () => {
    // The failure mode that matters. A reader left with a blank list has lost
    // the results entirely, which is far worse than an unsorted list.
    renderSearchPage(pageOf(105));
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));

    createAreaSorter(document, logger, { delayMs: 0 }).syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    await vi.waitFor(() => expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull());
    expect(document.querySelectorAll('li').length).toBeGreaterThan(0);
    expect(document.querySelector('[data-lbc-prix-m2-summary]')?.textContent).toContain('échoué');
  });

  it('shows the ads again when the sort is abandoned mid-collection', async () => {
    renderSearchPage(pageOf(105));
    vi.mocked(fetch).mockImplementation(slowPage);
    const sorter = createAreaSorter(document, logger, { delayMs: 0 });
    sorter.syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    sorter.reset();

    expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull();
    expect(document.querySelectorAll('li').length).toBeGreaterThan(0);
  });
});

describe('reset', () => {
  it('puts the list back in leboncoin’s order', async () => {
    const before = listedPrices();
    const sorter = createAreaSorter(document, logger, { delayMs: 0 });
    sorter.syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    sorter.reset();

    expect(listedPrices()).toEqual(before);
    expect(document.querySelector('[data-lbc-prix-m2-summary]')).toBeNull();
    expect(sorter.active()).toBeNull();
  });

  it('is harmless when nothing was sorted', () => {
    const sorter = createAreaSorter(document, logger, { delayMs: 0 });

    expect(() => sorter.reset()).not.toThrow();
  });
});
