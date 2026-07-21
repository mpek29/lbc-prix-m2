import { beforeEach, describe, expect, it } from 'vitest';
import { fixtureList } from '@/site/leboncoin/__fixtures__/load';
import { BADGE_MARKER, findBadges } from '@/ui/price-badge';
import { enhanceAdCards, removeAllBadges } from './enhance-ad-cards';

/** A results page as leboncoin serves it: two usable cards, two that are not. */
function renderResultsPage() {
  document.body.innerHTML = fixtureList(
    'ad-card-rental',
    'ad-card-sale',
    'ad-card-no-area',
    'ad-card-no-price',
  );
}

const badgeTexts = () => findBadges(document).map((badge) => badge.getAttribute(BADGE_MARKER));

/** Rewrites both halves of leboncoin's dual-rendered price, as a re-render would. */
function repriceFirstCard(price: string): void {
  const card = document.querySelector('li');
  const spoken = Array.from(card?.querySelectorAll('.sr-only') ?? []).find((node) =>
    node.textContent?.trim().startsWith('Prix'),
  );
  const shown = Array.from(card?.querySelectorAll('p[aria-hidden="true"]') ?? []).find((node) =>
    node.textContent?.includes('€'),
  );

  if (!spoken || !shown) throw new Error('fixture no longer renders a price the way it used to');
  spoken.textContent = `Prix: ${price}.`;
  shown.textContent = price;
}

beforeEach(() => {
  renderResultsPage();
});

describe('enhanceAdCards', () => {
  it('badges the cards it can price and reports on the ones it cannot', () => {
    const report = enhanceAdCards(document);

    expect(report).toEqual({
      cards: 4,
      badged: 2,
      unchanged: 0,
      skipped: { 'no-price': 1, 'no-area': 1, implausible: 0 },
    });
  });

  it('computes the figure the user came for', () => {
    enhanceAdCards(document);

    // 640 € / 55 m² and 249 000 € / 128 m².
    expect(badgeTexts()).toEqual(['11,6 €/m²', expect.stringMatching(/^1\s?945 €\/m²$/)]);
  });

  it('puts the badge immediately after the price', () => {
    enhanceAdCards(document);

    const badge = findBadges(document)[0];
    expect(badge?.previousElementSibling?.textContent).toContain('640');
  });

  it('leaves the cards it skips exactly as leboncoin served them', () => {
    const before = document.querySelectorAll('li')[2]?.outerHTML;

    enhanceAdCards(document);

    expect(document.querySelectorAll('li')[2]?.outerHTML).toBe(before);
  });

  it('is idempotent — a second pass writes nothing', () => {
    enhanceAdCards(document);
    const report = enhanceAdCards(document);

    expect(report.badged).toBe(0);
    expect(report.unchanged).toBe(2);
    expect(findBadges(document)).toHaveLength(2);
  });

  it('refreshes a badge when the card is re-rendered with different data', () => {
    // React reuses DOM nodes across pages of an infinite scroll, so the same
    // element can end up describing a completely different ad.
    enhanceAdCards(document);
    repriceFirstCard('900 €');

    const report = enhanceAdCards(document);

    expect(report.badged).toBe(1);
    expect(badgeTexts()[0]).toBe('16,4 €/m²');
  });

  it('drops a badge when the card stops being priceable', () => {
    enhanceAdCards(document);
    for (const node of document.querySelectorAll('article')) node.removeAttribute('aria-label');
    for (const node of document.querySelectorAll('[aria-label]'))
      node.removeAttribute('aria-label');
    for (const node of document.querySelectorAll('p')) node.textContent = '';

    const report = enhanceAdCards(document);

    expect(report.skipped['no-price']).toBe(4);
    expect(findBadges(document)).toHaveLength(0);
  });
});

describe('removeAllBadges', () => {
  it('takes the page back to how it was served', () => {
    const before = document.body.innerHTML;
    enhanceAdCards(document);

    expect(removeAllBadges(document)).toBe(2);
    expect(document.body.innerHTML).toBe(before);
  });

  it('does nothing on a page that was never enhanced', () => {
    expect(removeAllBadges(document)).toBe(0);
  });
});
