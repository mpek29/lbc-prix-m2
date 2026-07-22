import { beforeEach, describe, expect, it } from 'vitest';
import { fixtureList } from './__fixtures__/load';
import { findPagination } from './pagination';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('findPagination', () => {
  it('finds the block holding the page links', () => {
    document.body.innerHTML = `
      ${fixtureList('ad-card-rental')}
      <nav id="pager">
        <a href="/recherche?category=10&page=1">1</a>
        <a href="/recherche?category=10&page=2">2</a>
        <a href="/recherche?category=10&page=2" aria-label="Page suivante">›</a>
      </nav>`;

    expect(findPagination(document)?.id).toBe('pager');
  });

  it('finds it without a nav element', () => {
    document.body.innerHTML = `
      ${fixtureList('ad-card-rental')}
      <div id="pager"><a href="?page=2">2</a><a href="?page=3">3</a></div>`;

    expect(findPagination(document)?.id).toBe('pager');
  });

  it('returns null on a page with no pagination', () => {
    document.body.innerHTML = fixtureList('ad-card-rental');

    expect(findPagination(document)).toBeNull();
  });

  it('refuses a match that would take the results with it', () => {
    // A stray page link somewhere unrelated walks the common ancestor upward
    // until it contains the ads too. Hiding that hides the search.
    document.body.innerHTML = `
      <div id="everything">
        <a href="?page=2">next</a>
        ${fixtureList('ad-card-rental')}
        <footer><a href="/aide?page=2">aide</a></footer>
      </div>`;

    expect(findPagination(document)).toBeNull();
  });

  it('never returns the body', () => {
    document.body.innerHTML = `<a href="?page=2">a</a><div><a href="?page=3">b</a></div>`;

    expect(findPagination(document)).toBeNull();
  });

  it('ignores ad links, which carry no page parameter', () => {
    document.body.innerHTML = fixtureList('ad-card-rental', 'ad-card-sale');

    expect(findPagination(document)).toBeNull();
  });
});
