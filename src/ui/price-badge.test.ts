import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BADGE_MARKER, createPriceBadge, findBadges, isBadge } from './price-badge';

/**
 * Read off disk rather than imported. Vite resolves `?raw` on a `.css` file to
 * an empty string under test, which silently turned the assertions below into
 * assertions about nothing, so the first thing this suite checks is that it
 * actually has the stylesheet in its hands.
 */
const stylesheet = readFileSync(resolve(process.cwd(), 'src/ui/price-badge.css'), 'utf8');

describe('the stylesheet', () => {
  it('was actually loaded', () => {
    expect(stylesheet).toContain('.lbc-prix-m2-badge');
    expect(stylesheet.length).toBeGreaterThan(200);
  });

  it('does not follow the system colour scheme', () => {
    // Regression guard for a shipped bug. `prefers-color-scheme` describes the
    // user's operating system, not the page we are injected into. leboncoin is
    // white in every configuration, so a dark branch painted near-white text
    // onto a white card for every user with dark mode enabled.
    expect(stylesheet).not.toMatch(/prefers-color-scheme\s*:\s*dark\s*\)/);
  });

  it('paints its own background, so it is legible on any host page', () => {
    expect(stylesheet).toMatch(/background:\s*var\(--lbc-prix-m2-bg\)/);
  });
});

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
