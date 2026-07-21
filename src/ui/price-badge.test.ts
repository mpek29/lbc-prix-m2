import { describe, expect, it } from 'vitest';
import { BADGE_MARKER, createPriceBadge, findBadges, isBadge } from './price-badge';

describe('createPriceBadge', () => {
  it('shows the formatted figure', () => {
    const badge = createPriceBadge(document, 11.636);

    expect(badge.textContent).toContain('11,6 €/m²');
  });

  it('hides the visual figure from assistive technology and spells it out instead', () => {
    const badge = createPriceBadge(document, 11.636);

    const visual = badge.querySelector('[aria-hidden="true"]');
    expect(visual?.textContent).toBe('11,6 €/m²');
    expect(badge.textContent).toContain('Prix au mètre carré : 11,6 euros.');
  });

  it('carries the marker attribute so it can be found and removed again', () => {
    const badge = createPriceBadge(document, 11.636);

    expect(badge.hasAttribute(BADGE_MARKER)).toBe(true);
    expect(isBadge(badge)).toBe(true);
  });

  it('builds the badge without ever parsing markup', () => {
    // A regression guard for the day someone reaches for innerHTML: if the
    // value ever reached the DOM as markup, this would create an element.
    const badge = createPriceBadge(document, 11.636);
    document.body.replaceChildren(badge);

    expect(document.querySelector('img')).toBeNull();
    expect(badge.querySelectorAll('span')).toHaveLength(2);
  });
});

describe('findBadges', () => {
  it('finds only our own nodes', () => {
    document.body.replaceChildren(createPriceBadge(document, 11.6));
    document.body.append(document.createElement('span'));

    expect(findBadges(document)).toHaveLength(1);
  });
});

describe('isBadge', () => {
  it('rejects nodes the extension did not create', () => {
    expect(isBadge(document.createElement('span'))).toBe(false);
    expect(isBadge(document.createTextNode('640 €'))).toBe(false);
  });
});
