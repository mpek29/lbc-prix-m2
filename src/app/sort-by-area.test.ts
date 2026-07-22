import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@/platform/logger';
import { fixture, fixtureList } from '@/site/leboncoin/__fixtures__/load';
import { findSortRadioGroup } from '@/site/leboncoin/sort-control';
import { findSortOptions } from '@/ui/sort-option';
import { createAreaSorter } from './sort-by-area';

const logger: Logger = { debug: vi.fn(), warn: vi.fn(), error: vi.fn() };
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * A results page: the sort menu open, a list of ads, and the totals blob.
 *
 * The blob defaults to a single-page search so nothing fetches unless a test
 * asks for it. Leaving it out entirely means "totals unknown", which is now a
 * request to walk the pages, not a request to sort what is on screen.
 */
function renderSearchPage(nextData: unknown = pageOf(3)) {
  // `null` means omit the blob. `undefined` cannot: passing it explicitly just
  // re-triggers the default parameter, which cost an hour the first time.
  document.body.innerHTML = `
    ${fixture('sort-radiogroup')}
    ${fixtureList('ad-card-rental', 'ad-card-sale', 'ad-card-no-area')}
    ${
      nextData === null
        ? ''
        : `<script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`
    }`;
}

const pageOf = (total: number) => ({
  props: { pageProps: { searchData: { total, max_pages: 100 }, search: { limit: 35 } } },
});

/**
 * A fetched page whose ads are new every time.
 *
 * Returning the same fixture for every page is indistinguishable from
 * leboncoin clamping a too-high page number, so the walk stops on page 2 and
 * any test about multi-page collection measures nothing.
 */
const running: { reset(): void }[] = [];

/**
 * Builds a sorter and remembers it, so `afterEach` can abandon it.
 *
 * A test that stops waiting partway through a collection leaves the walk
 * running, and its remaining requests land inside the next test. That produced
 * a fetch count of 2 in a test that only ever fetched once.
 */
function makeSorter(options: { delayMs?: number; budgetPages?: number } = {}) {
  const sorter = createAreaSorter(document, logger, { delayMs: 0, ...options });
  running.push(sorter);
  return sorter;
}

let pageSequence = 0;
const freshPage = () => {
  pageSequence += 1;
  const html = fixtureList('ad-card-sale').replaceAll('2984110023', `90000000${pageSequence}`);
  return new Response(`<html><body>${html}</body></html>`, { status: 200 });
};

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
  pageSequence = 0;
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  for (const sorter of running.splice(0)) sorter.reset();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('the sort menu', () => {
  it('gains the two options', () => {
    makeSorter().syncMenu();

    expect(optionLabels()).toEqual(['Prix/m² croissant', 'Prix/m² décroissant']);
  });

  it('puts them inside leboncoin’s own group, after their options', () => {
    makeSorter().syncMenu();

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
    const sorter = makeSorter();

    sorter.syncMenu();
    sorter.syncMenu();

    expect(findSortOptions(document)).toHaveLength(2);
  });

  it('does nothing while the menu is closed', () => {
    document.body.innerHTML = fixtureList('ad-card-rental');

    makeSorter().syncMenu();

    expect(findSortOptions(document)).toHaveLength(0);
  });
});

describe('choosing an option', () => {
  it('reorders the ads by price per square metre', async () => {
    // The fixtures are laid out cheapest-first, so an ascending sort that never
    // ran looks identical to one that worked. Reversing the list first makes
    // the assertion mean something: it can only pass if the sort really ran.
    const list = document.querySelector('ul')!;
    list.replaceChildren(...Array.from(list.children).reverse());

    const sorter = makeSorter();
    sorter.syncMenu();

    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    // 11,6 €/m² (640/55) before 1 945 €/m² (249 000/128), unpriceable last.
    expect(listedPrices()).toEqual(['Prix: 640 €.', 'Prix: 249 000 €.', 'Prix: 75 €.']);
    expect(sorter.active()).toBe('asc');
  });

  it('reverses for décroissant', async () => {
    const sorter = makeSorter();
    sorter.syncMenu();

    findSortOptions(document)[1]?.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    expect(listedPrices()).toEqual(['Prix: 249 000 €.', 'Prix: 640 €.', 'Prix: 75 €.']);
    expect(sorter.active()).toBe('desc');
  });

  it('clears leboncoin’s selection, so the menu shows one chosen option', async () => {
    const sorter = makeSorter();
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
    makeSorter().syncMenu();

    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    expect(document.querySelector('[data-lbc-prix-m2-summary]')?.textContent).toContain(
      'Prix/m² croissant',
    );
  });
});

describe('when the result count cannot be read', () => {
  it('walks the pages instead of giving up and sorting one page', async () => {
    // The bug this test exists for. The first version read the total out of
    // __NEXT_DATA__ and silently degraded to a single-page sort when it could
    // not, which is what shipped and what the reader saw.
    renderSearchPage(null);
    vi.mocked(fetch).mockImplementation(async () => freshPage());

    makeSorter().syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    await vi.waitFor(() => expect(fetch).toHaveBeenCalled());
  });

  it('stops as soon as a page produces nothing new', async () => {
    // leboncoin can clamp a too-high page number back to one already read. With
    // the total unknown the plan is the full ceiling, so without this a
    // one-page search would spend a hundred requests on the same 35 ads.
    renderSearchPage(null);
    vi.mocked(fetch).mockImplementation(
      async () =>
        new Response(`<html><body>${fixtureList('ad-card-rental')}</body></html>`, { status: 200 }),
    );

    makeSorter().syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    await vi.waitFor(() => expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull());
    // Page 2 returned an ad page 1 already had, so the walk stopped there.
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('stops when a page comes back with no ads, as a challenge page does', async () => {
    renderSearchPage(null);
    vi.mocked(fetch).mockImplementation(
      async () => new Response('<html><body><div>captcha</div></body></html>', { status: 200 }),
    );

    makeSorter().syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    await vi.waitFor(() => expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull());
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(document.querySelectorAll('li').length).toBeGreaterThan(0);
  });
});

describe('when the search spans more pages than leboncoin will serve', () => {
  it('admits the sort is partial rather than implying it covered everything', async () => {
    // 217 762 rentals, 6 222 pages, and leboncoin stops at 100. No budget and
    // no patience gets past that, so the banner has to say so.
    renderSearchPage(pageOf(217_762));
    vi.mocked(fetch).mockImplementation(async () => freshPage());

    makeSorter({ budgetPages: 20 }).syncMenu();
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

    makeSorter().syncMenu();
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
    vi.mocked(fetch).mockImplementation(async () => freshPage());

    makeSorter().syncMenu();
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

    makeSorter().syncMenu();
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

    makeSorter().syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await vi.waitFor(() => expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull());

    expect(document.querySelector('[role="progressbar"]')).toBeNull();
    expect(document.querySelectorAll('li').length).toBeGreaterThan(0);
  });

  it('does not hide anything when there is nothing to fetch', () => {
    // A single page of results is already in the DOM, so there is no wait to
    // cover and a flash of hidden cards would be pure noise.
    renderSearchPage(pageOf(3));

    makeSorter().syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull();
  });

  it('shows the ads again when the network fails', async () => {
    // The failure mode that matters. A reader left with a blank list has lost
    // the results entirely, which is far worse than an unsorted list.
    renderSearchPage(pageOf(105));
    vi.mocked(fetch).mockRejectedValue(new Error('offline'));

    makeSorter().syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    await vi.waitFor(() => expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull());
    expect(document.querySelectorAll('li').length).toBeGreaterThan(0);
    expect(document.querySelector('[data-lbc-prix-m2-summary]')?.textContent).toContain('échoué');
  });

  it('shows the ads again when the sort is abandoned mid-collection', async () => {
    renderSearchPage(pageOf(105));
    vi.mocked(fetch).mockImplementation(slowPage);
    const sorter = makeSorter();
    sorter.syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));

    sorter.reset();

    expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull();
    expect(document.querySelectorAll('li').length).toBeGreaterThan(0);
  });
});

describe('when the walk stops before the advertised total', () => {
  it('reports both numbers instead of claiming it got everything', async () => {
    // The bug this test exists for. "A page gave us nothing new" is what
    // running out of results looks like, and equally what leboncoin returning
    // page 1 for page 2 looks like, and what a challenge page looks like.
    // Calling that "complete" is the quiet lie the banner exists to prevent.
    renderSearchPage(pageOf(70)); // 2 pages
    vi.mocked(fetch).mockImplementation(
      async () =>
        new Response(`<html><body>${fixtureList('ad-card-rental')}</body></html>`, { status: 200 }),
    );

    makeSorter().syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await vi.waitFor(() => expect(document.querySelector('[data-lbc-prix-m2-busy]')).toBeNull());

    const summary = document.querySelector('[data-lbc-prix-m2-summary]')?.textContent ?? '';
    expect(summary).toContain('sur 70 annoncées');
    expect(summary).toContain('n’a pas renvoyé la suite');
    expect(summary).not.toContain('de cette recherche');
  });

  it('says so in the console, which released builds still show', async () => {
    renderSearchPage(pageOf(70));
    vi.mocked(fetch).mockImplementation(
      async () =>
        new Response(`<html><body>${fixtureList('ad-card-rental')}</body></html>`, { status: 200 }),
    );

    makeSorter().syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await vi.waitFor(() => expect(logger.warn).toHaveBeenCalled());

    expect(vi.mocked(logger.warn).mock.calls[0]?.[0]).toMatch(/advertises 70/);
  });
});

describe('reset', () => {
  it('puts the list back in leboncoin’s order', async () => {
    const before = listedPrices();
    const sorter = makeSorter();
    sorter.syncMenu();
    findSortOptions(document)[0]?.dispatchEvent(new Event('click', { bubbles: true }));
    await settle();

    sorter.reset();

    expect(listedPrices()).toEqual(before);
    expect(document.querySelector('[data-lbc-prix-m2-summary]')).toBeNull();
    expect(sorter.active()).toBeNull();
  });

  it('is harmless when nothing was sorted', () => {
    const sorter = makeSorter();

    expect(() => sorter.reset()).not.toThrow();
  });
});
