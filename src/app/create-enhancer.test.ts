import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from '@/platform/logger';
import { fixtureList } from '@/site/leboncoin/__fixtures__/load';
import { findBadges } from '@/ui/price-badge';
import { createEnhancer } from './create-enhancer';

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

const fakeLogger = (): Logger => ({ debug: vi.fn(), warn: vi.fn(), error: vi.fn() });

let enhancer: ReturnType<typeof createEnhancer> | null = null;

beforeEach(() => {
  document.body.innerHTML = fixtureList('ad-card-rental', 'ad-card-sale', 'ad-card-no-area');
});

afterEach(() => {
  enhancer?.stop();
  enhancer = null;
});

describe('createEnhancer', () => {
  it('badges the page as soon as it starts', () => {
    enhancer = createEnhancer(document, fakeLogger());

    enhancer.start();

    expect(findBadges(document)).toHaveLength(2);
  });

  it('badges cards that arrive later', async () => {
    // The results list is rendered client-side and grows on scroll, so this is
    // the normal case, not an edge case.
    enhancer = createEnhancer(document, fakeLogger());
    enhancer.start();

    document.body.insertAdjacentHTML('beforeend', fixtureList('ad-card-rental'));
    await settle();

    expect(findBadges(document)).toHaveLength(3);
  });

  it('does not react to its own badges', async () => {
    const logger = fakeLogger();
    enhancer = createEnhancer(document, logger);

    enhancer.start();
    await settle();
    await settle();

    // Two badges, and no runaway insert-observe-insert loop.
    expect(findBadges(document)).toHaveLength(2);
  });

  it('starting twice is a no-op', () => {
    enhancer = createEnhancer(document, fakeLogger());

    enhancer.start();
    enhancer.start();

    expect(findBadges(document)).toHaveLength(2);
  });

  it('stopping removes every badge and stops watching', async () => {
    enhancer = createEnhancer(document, fakeLogger());
    enhancer.start();

    enhancer.stop();
    document.body.insertAdjacentHTML('beforeend', fixtureList('ad-card-rental'));
    await settle();

    expect(findBadges(document)).toHaveLength(0);
  });

  it('stopping before starting is harmless', () => {
    enhancer = createEnhancer(document, fakeLogger());

    expect(() => enhancer?.stop()).not.toThrow();
  });
});

describe('when leboncoin changes its markup', () => {
  /** A full page of cards where no price can be found: the signature of drift. */
  function renderPageWithUnreadablePrices() {
    document.body.innerHTML = fixtureList('ad-card-rental', 'ad-card-sale', 'ad-card-rental');
    for (const node of document.querySelectorAll('.sr-only, p[aria-hidden="true"]')) node.remove();
  }

  it('says so, rather than going quietly silent', () => {
    renderPageWithUnreadablePrices();
    const logger = fakeLogger();
    enhancer = createEnhancer(document, logger);

    enhancer.start();

    expect(logger.warn).toHaveBeenCalledOnce();
    expect(vi.mocked(logger.warn).mock.calls[0]?.[0]).toMatch(/no price could be read/);
  });

  it('says so once, not on every pass', async () => {
    renderPageWithUnreadablePrices();
    const logger = fakeLogger();
    enhancer = createEnhancer(document, logger);
    enhancer.start();

    document.body.insertAdjacentHTML('beforeend', '<div></div>');
    await settle();

    expect(logger.warn).toHaveBeenCalledOnce();
  });

  it('stays quiet when a page simply has no priceable ads on it', () => {
    // One parking space is not a broken selector, and crying wolf here would
    // train users to ignore the warning that matters.
    document.body.innerHTML = fixtureList('ad-card-no-area', 'ad-card-no-price');
    const logger = fakeLogger();
    enhancer = createEnhancer(document, logger);

    enhancer.start();

    expect(logger.warn).not.toHaveBeenCalled();
  });
});
