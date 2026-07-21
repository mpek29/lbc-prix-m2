import { beforeEach, describe, expect, it } from 'vitest';
import { fixtureList } from '@/site/leboncoin/__fixtures__/load';
import { collectFrom, IMPORTED_MARKER, mergeUnique } from './collect-listings';

const parse = (html: string) =>
  new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('collectFrom', () => {
  it('prices every ad it can and reports the rest as unpriced', () => {
    document.body.innerHTML = fixtureList(
      'ad-card-rental',
      'ad-card-sale',
      'ad-card-no-area',
      'ad-card-no-price',
    );

    const ads = collectFrom(document, document);

    expect(ads).toHaveLength(4);
    expect(ads[0]?.pricePerArea).toBeCloseTo(11.64, 1);
    expect(ads[1]?.pricePerArea).toBeCloseTo(1945.3, 1);
    expect(ads[2]?.pricePerArea).toBeNull();
    expect(ads[3]?.pricePerArea).toBeNull();
  });

  it('keeps the ads already on screen as their own elements', () => {
    document.body.innerHTML = fixtureList('ad-card-rental');
    const original = document.querySelector('li');

    const [ad] = collectFrom(document, document);

    expect(ad?.item).toBe(original);
    expect(ad?.imported).toBe(false);
  });

  it('imports ads from a fetched page so they can be inserted here', () => {
    // A node belongs to the document that parsed it. Inserting it into another
    // one without importing throws WrongDocumentError in a real browser.
    const fetched = parse(fixtureList('ad-card-sale'));

    const [ad] = collectFrom(fetched, document);

    expect(ad?.imported).toBe(true);
    expect(ad?.item.ownerDocument).toBe(document);
    expect(ad?.item.hasAttribute(IMPORTED_MARKER)).toBe(true);
    expect(() => document.body.append(ad!.item)).not.toThrow();
  });

  it('reads a fetched page with the same adapter as the live one', () => {
    const fetched = parse(fixtureList('ad-card-rental'));

    expect(collectFrom(fetched, document)[0]?.pricePerArea).toBeCloseTo(11.64, 1);
  });
});

describe('mergeUnique', () => {
  const ad = (id: string | null) => ({
    id,
    pricePerArea: 10,
    item: document.createElement('li'),
    imported: false,
  });

  it('drops an ad that appears on two pages', () => {
    // Relevance ranking is not a stable total order, so the same ad can come
    // back on page 2 after being on page 1 moments earlier.
    const merged = mergeUnique([
      [ad('a'), ad('b')],
      [ad('b'), ad('c')],
    ]);

    expect(merged.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  it('keeps ads whose id could not be read, since they cannot be compared', () => {
    const merged = mergeUnique([[ad(null)], [ad(null)]]);

    expect(merged).toHaveLength(2);
  });

  it('preserves page order', () => {
    const merged = mergeUnique([[ad('a')], [ad('b')], [ad('c')]]);

    expect(merged.map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });
});
