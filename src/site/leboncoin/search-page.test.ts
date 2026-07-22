import { describe, expect, it } from 'vitest';
import { pageCount, pageUrl, planFetch, readPagination, readResultCount } from './search-page';

/** The shape leboncoin actually serves, trimmed to the fields we read. */
function pageWithNextData(searchData: unknown, search: unknown = { limit: 35 }): Document {
  const doc = document.implementation.createHTMLDocument();
  const script = doc.createElement('script');
  script.id = '__NEXT_DATA__';
  script.type = 'application/json';
  script.textContent = JSON.stringify({ props: { pageProps: { searchData, search } } });
  doc.body.append(script);
  return doc;
}

describe('readPagination', () => {
  it('reads the totals a real search page carries', () => {
    // Measured on /recherche?category=10 while building this.
    const doc = pageWithNextData({ total: 217_762, max_pages: 100 });

    expect(readPagination(doc)).toEqual({ total: 217_762, perPage: 35, maxPages: 100 });
  });

  it.each([
    ['no __NEXT_DATA__ at all', document.implementation.createHTMLDocument()],
    [
      'malformed JSON',
      (() => {
        const doc = document.implementation.createHTMLDocument();
        const script = doc.createElement('script');
        script.id = '__NEXT_DATA__';
        script.textContent = '{not json';
        doc.body.append(script);
        return doc;
      })(),
    ],
    ['a missing total', pageWithNextData({ max_pages: 100 })],
    ['a total that is not a number', pageWithNextData({ total: 'many', max_pages: 100 })],
  ])('still reports a usable plan with %s', (_label, doc) => {
    // The first version returned null here and the caller quietly degraded to
    // sorting one page. That is what shipped, and it is what the reader saw:
    // "35 annonces affichées triées" on a search with thousands of results.
    // An unknown total now means "walk until the pages run out", not "give up".
    expect(readPagination(doc)).toEqual({ total: null, perPage: 35, maxPages: 100 });
  });

  it('falls back to the count leboncoin prints for the reader', () => {
    // Preferred over the JSON for the same reason the ad reader prefers ARIA:
    // this text has to stay correct because people read it.
    const doc = document.implementation.createHTMLDocument();
    doc.body.innerHTML = '<h1>Locations</h1><p>217 762 annonces</p>';

    expect(readPagination(doc).total).toBe(217_762);
  });

  it('prefers the JSON when both are present', () => {
    const doc = pageWithNextData({ total: 74, max_pages: 3 });
    doc.body.insertAdjacentHTML('afterbegin', '<p>217 762 annonces</p>');

    expect(readPagination(doc).total).toBe(74);
  });
});

describe('readResultCount', () => {
  it.each([
    ['a plain space', '217 762 annonces', 217_762],
    ['a narrow no-break space', '217 762 annonces', 217_762],
    ['a small result set', '74 annonces', 74],
    ['the singular', '1 annonce', 1],
    ['the word résultats', '512 résultats', 512],
  ])('reads a count written with %s', (_label, text, expected) => {
    const doc = document.implementation.createHTMLDocument();
    doc.body.textContent = text;

    expect(readResultCount(doc)).toBe(expected);
  });

  it.each([
    ['a page with no count on it', 'Déposer une annonce'],
    ['an empty page', ''],
  ])('returns null for %s', (_label, text) => {
    const doc = document.implementation.createHTMLDocument();
    doc.body.textContent = text;

    expect(readResultCount(doc)).toBeNull();
  });
});

describe('pageCount', () => {
  it('rounds a partial last page up', () => {
    expect(pageCount({ total: 74, perPage: 35, maxPages: 100 })).toBe(3);
    expect(pageCount({ total: 70, perPage: 35, maxPages: 100 })).toBe(2);
  });
});

describe('planFetch', () => {
  it('covers a small search completely', () => {
    // Concarneau rentals: 74 results, 3 pages, 3 requests, all of it.
    expect(planFetch({ total: 74, perPage: 35, maxPages: 100 }, 20)).toEqual({
      pages: 3,
      perPage: 35,
      reachable: 74,
      total: 74,
      complete: true,
      capped: false,
    });
  });

  it('stops at our own budget and admits the sort is partial', () => {
    const plan = planFetch({ total: 217_762, perPage: 35, maxPages: 100 }, 20);

    expect(plan).toEqual({
      pages: 20,
      perPage: 35,
      reachable: 700,
      total: 217_762,
      complete: false,
      capped: true,
    });
  });

  it('stops at leboncoin’s ceiling even when our budget is larger', () => {
    // Their max_pages is 100, so 6 222 pages of results are not reachable at
    // any budget. No amount of politeness or patience gets past this.
    const plan = planFetch({ total: 217_762, perPage: 35, maxPages: 100 }, 1000);

    expect(plan.pages).toBe(100);
    expect(plan.reachable).toBe(3500);
    expect(plan.complete).toBe(false);
  });

  it('plans for the full ceiling when the total is unknown', () => {
    // Nothing is claimed about coverage here. The walk stops when a page stops
    // producing new ads, which is the only signal available without a total.
    const plan = planFetch({ total: null, perPage: 35, maxPages: 100 }, 20);

    expect(plan).toEqual({
      pages: 20,
      perPage: 35,
      reachable: null,
      total: null,
      complete: false,
      capped: false,
    });
  });

  it('never claims to reach more ads than exist', () => {
    const plan = planFetch({ total: 10, perPage: 35, maxPages: 100 }, 20);

    expect(plan).toEqual({
      pages: 1,
      perPage: 35,
      reachable: 10,
      total: 10,
      complete: true,
      capped: false,
    });
  });
});

describe('planFetch capped flag', () => {
  it('is false when the whole search fits, so a shortfall is not blamed on leboncoin', () => {
    // A 62 result search once reported "leboncoin ne permet pas d'aller
    // au-delà" after collecting 50. Nothing near their ceiling was involved.
    expect(planFetch({ total: 62, perPage: 35, maxPages: 100 }, 100).capped).toBe(false);
  });

  it('is true when a ceiling really did cut the plan short', () => {
    expect(planFetch({ total: 217_762, perPage: 35, maxPages: 100 }, 100).capped).toBe(true);
  });
});

describe('pageUrl', () => {
  const search = 'https://www.leboncoin.fr/recherche?category=10&locations=Concarneau_29900';

  it('adds the page parameter', () => {
    expect(pageUrl(search, 3)).toBe(`${search}&page=3`);
  });

  it('leaves page 1 without a parameter, as leboncoin does', () => {
    expect(pageUrl(search, 1)).toBe(search);
  });

  it('replaces an existing page parameter rather than appending one', () => {
    expect(pageUrl(`${search}&page=7`, 2)).toBe(`${search}&page=2`);
  });

  it('pins the sort when asked, so the pages tile the result set', () => {
    // Relevance is re-ranked between requests, so page N does not mean the same
    // thing twice. An explicit sort is what makes a walk cover the set once.
    const url = new URL(pageUrl(search, 2, 'price,asc'));

    expect(url.searchParams.get('sort')).toBe('price,asc');
    expect(url.searchParams.get('page')).toBe('2');
  });

  it('replaces a sort the reader had already chosen', () => {
    const url = new URL(pageUrl(`${search}&sort=time,desc`, 1, 'price,asc'));

    expect(url.searchParams.get('sort')).toBe('price,asc');
  });

  it('leaves the sort alone when none is pinned', () => {
    expect(new URL(pageUrl(`${search}&sort=time,desc`, 2)).searchParams.get('sort')).toBe(
      'time,desc',
    );
  });

  it('keeps every other search filter intact', () => {
    const url = new URL(pageUrl(`${search}&price=500-900&rooms=3`, 4));

    expect(url.searchParams.get('locations')).toBe('Concarneau_29900');
    expect(url.searchParams.get('price')).toBe('500-900');
    expect(url.searchParams.get('rooms')).toBe('3');
  });
});
