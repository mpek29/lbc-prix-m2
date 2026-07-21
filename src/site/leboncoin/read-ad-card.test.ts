import { beforeEach, describe, expect, it } from 'vitest';
import { fixture, fixtureList, type FixtureName } from './__fixtures__/load';
import { findAdCards, readAdCard } from './read-ad-card';

/** Renders a captured card and returns the element the adapter would be given. */
function mountCard(html: string): Element {
  document.body.innerHTML = `<ul>${html}</ul>`;
  const card = findAdCards(document)[0];
  if (!card) throw new Error('fixture contains no ad card, the capture is broken, not the code');
  return card;
}

const read = (name: FixtureName) => readAdCard(mountCard(fixture(name)));

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('findAdCards', () => {
  it('finds every card in a results list', () => {
    document.body.innerHTML = fixtureList(
      'ad-card-rental',
      'ad-card-sale',
      'ad-card-no-area',
      'ad-card-no-price',
    );

    expect(findAdCards(document)).toHaveLength(4);
  });

  it('finds nothing on a page that is not a results list', () => {
    document.body.innerHTML = '<main><h1>Déposer une annonce</h1></main>';

    expect(findAdCards(document)).toHaveLength(0);
  });
});

describe('readAdCard', () => {
  it('reads a rental card', () => {
    const reading = read('ad-card-rental');

    expect(reading).toMatchObject({
      kind: 'listing',
      listing: { id: '3218511921', price: 640, area: 55 },
    });
  });

  it('reads a sale card, where the price runs into six figures', () => {
    const reading = read('ad-card-sale');

    expect(reading).toMatchObject({
      kind: 'listing',
      listing: { id: '2984110023', price: 249_000, area: 128 },
    });
  });

  it('prefers the living space over the plot size', () => {
    // The title reads "128m² · Terrain 620m²". Reading the wrong one turns a
    // 1 945 €/m² house into a 402 €/m² one, plausible enough to go unnoticed.
    const reading = read('ad-card-sale');

    expect(reading.kind === 'listing' && reading.listing.area).toBe(128);
  });

  it('anchors the badge on the visible price, not on the screen-reader copy', () => {
    const reading = read('ad-card-rental');

    expect(reading.kind).toBe('listing');
    if (reading.kind !== 'listing') return;
    expect(reading.priceAnchor.textContent).toContain('640');
    expect(reading.priceAnchor.getAttribute('aria-hidden')).toBe('true');
  });

  it('skips a listing with no surface', () => {
    expect(read('ad-card-no-area')).toEqual({ kind: 'skipped', reason: 'no-area' });
  });

  it('skips a listing with no price', () => {
    expect(read('ad-card-no-price')).toEqual({ kind: 'skipped', reason: 'no-price' });
  });
});

describe('nodes the extension injected itself', () => {
  /** Stands in for a badge: same shape, same problem: it contains a price. */
  function injectAfterPrice(card: Element): Element {
    const injected = document.createElement('span');
    injected.setAttribute('data-injected', '');
    injected.textContent = '11,6 €/m²';

    const spoken = Array.from(card.querySelectorAll('.sr-only')).find((node) =>
      node.textContent?.startsWith('Prix'),
    );
    spoken?.previousElementSibling?.after(injected);
    return injected;
  }

  const isInjected = (node: Node) => node instanceof Element && node.hasAttribute('data-injected');

  it('anchors on leboncoin’s price, not on what we put next to it', () => {
    const card = mountCard(fixture('ad-card-rental'));
    const injected = injectAfterPrice(card);

    const reading = readAdCard(card, { isInjected });

    expect(reading.kind).toBe('listing');
    if (reading.kind !== 'listing') return;
    expect(reading.priceAnchor).not.toBe(injected);
    expect(reading.priceAnchor.textContent).toContain('640');
  });

  it('does not read a price back out of injected content', () => {
    const card = mountCard(fixture('ad-card-rental'));
    for (const node of card.querySelectorAll('.sr-only, p[aria-hidden="true"]')) node.remove();
    injectAfterPrice(card);

    expect(readAdCard(card, { isInjected })).toEqual({ kind: 'skipped', reason: 'no-price' });
  });
});

describe('resilience to a leboncoin restyle', () => {
  it('still reads a card after every class attribute is stripped', () => {
    // This is the whole bet of the adapter: class names carry a build hash and
    // change without notice, so nothing may depend on them. Stripping them all
    // simulates the most aggressive restyle the site could ship.
    const card = mountCard(fixture('ad-card-rental'));
    for (const node of document.querySelectorAll('[class]')) node.removeAttribute('class');

    expect(readAdCard(card)).toMatchObject({
      kind: 'listing',
      listing: { price: 640, area: 55 },
    });
  });

  it('falls back to the visible price when the screen-reader copy is gone', () => {
    const card = mountCard(fixture('ad-card-rental'));
    for (const node of document.querySelectorAll('.sr-only')) node.remove();

    const reading = readAdCard(card);

    expect(reading).toMatchObject({ kind: 'listing', listing: { price: 640 } });
    expect(reading.kind === 'listing' && reading.priceAnchor.textContent).toContain('640');
  });

  it('falls back to card text when the accessible names are gone', () => {
    const card = mountCard(fixture('ad-card-rental'));
    for (const node of document.querySelectorAll('[aria-label]'))
      node.removeAttribute('aria-label');

    expect(readAdCard(card)).toMatchObject({ kind: 'listing', listing: { area: 55 } });
  });
});
