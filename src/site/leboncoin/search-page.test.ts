import { describe, expect, it } from 'vitest';
import { pageCount, pageUrl, planFetch, readPagination } from './search-page';

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
    ['a missing page size', pageWithNextData({ total: 74, max_pages: 3 }, {})],
  ])('degrades to null on %s', (_label, doc) => {
    // leboncoin owes us nothing here: __NEXT_DATA__ is their internal shape.
    // Losing it costs the multi-page sort, not the extension.
    expect(readPagination(doc)).toBeNull();
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
      reachable: 74,
      total: 74,
      complete: true,
    });
  });

  it('stops at our own budget and admits the sort is partial', () => {
    const plan = planFetch({ total: 217_762, perPage: 35, maxPages: 100 }, 20);

    expect(plan).toEqual({ pages: 20, reachable: 700, total: 217_762, complete: false });
  });

  it('stops at leboncoin’s ceiling even when our budget is larger', () => {
    // Their max_pages is 100, so 6 222 pages of results are not reachable at
    // any budget. No amount of politeness or patience gets past this.
    const plan = planFetch({ total: 217_762, perPage: 35, maxPages: 100 }, 1000);

    expect(plan.pages).toBe(100);
    expect(plan.reachable).toBe(3500);
    expect(plan.complete).toBe(false);
  });

  it('never claims to reach more ads than exist', () => {
    const plan = planFetch({ total: 10, perPage: 35, maxPages: 100 }, 20);

    expect(plan).toEqual({ pages: 1, reachable: 10, total: 10, complete: true });
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

  it('keeps every other search filter intact', () => {
    const url = new URL(pageUrl(`${search}&price=500-900&rooms=3`, 4));

    expect(url.searchParams.get('locations')).toBe('Concarneau_29900');
    expect(url.searchParams.get('price')).toBe('500-900');
    expect(url.searchParams.get('rooms')).toBe('3');
  });
});
