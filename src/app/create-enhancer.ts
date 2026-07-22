import { observeMutations } from '@/platform/dom-observer';
import type { Logger } from '@/platform/logger';
import { isBadge } from '@/ui/price-badge';
import { isPager } from '@/ui/pager';
import { isSortOption } from '@/ui/sort-option';
import { isSortSummary } from '@/ui/sort-summary';
import { createAreaSorter } from './sort-by-area';
import { enhanceAdCards, removeAllBadges, type EnhancementReport } from './enhance-ad-cards';

export interface Enhancer {
  /** Runs a first pass and keeps the page in sync. Calling it twice is a no-op. */
  start(): void;
  /** Stops watching and removes every badge. Calling it twice is a no-op. */
  stop(): void;
}

/**
 * The composition root of the feature: the only place where the site adapter,
 * the domain, the badge and the browser meet.
 *
 * Keeping it a factory rather than module-level state is what lets the popup
 * toggle the feature on and off within a single page load, and what lets the
 * tests drive it without a browser.
 */
export function createEnhancer(doc: Document, logger: Logger): Enhancer {
  let stopObserving: (() => void) | null = null;
  let warnedAboutDrift = false;

  // The sort menu is rendered on demand, so the same pass that badges the cards
  // also puts our options into the menu whenever leboncoin opens it.
  const sorter = createAreaSorter(doc, logger);

  const runPass = () => {
    sorter.syncMenu();
    const report = enhanceAdCards(doc);
    if (report.badged > 0) logger.debug('pass complete', report);

    if (!warnedAboutDrift && looksLikeSelectorDrift(report)) {
      warnedAboutDrift = true;
      logger.warn(
        `${report.cards} ad cards found but no price could be read from any of them. ` +
          'leboncoin has most likely changed its markup, please open an issue: ' +
          'https://github.com/mpek29/lbc-prix-m2/issues/new?template=selector-drift.yml',
      );
    }
  };

  return {
    start() {
      if (stopObserving) return;
      runPass();
      stopObserving = observeMutations(doc.body, runPass, { isOwnNode: isOurs });
      logger.debug('watching for new ad cards');
    },

    stop() {
      if (!stopObserving) return;
      stopObserving();
      stopObserving = null;
      sorter.reset();
      logger.debug('removed badges', { count: removeAllBadges(doc) });
    },
  };
}

/**
 * Everything this extension puts on the page: badges, sort rows, the summary.
 *
 * The observer needs the full set. Recognising only badges would let a sort row
 * we injected read as a page change, which schedules another pass, which
 * injects nothing and settles, but wakes the whole thing up for no reason on
 * every menu open.
 */
function isOurs(node: Node): boolean {
  return isBadge(node) || isSortOption(node) || isSortSummary(node) || isPager(node);
}

/**
 * Distinguishes "this page has no prices on it" from "we can no longer find the
 * prices on this page".
 *
 * A handful of ads legitimately hide their price, so a couple of misses mean
 * nothing. Every single card on a full page failing the same way does not
 * happen naturally, that is a selector that stopped matching, and the user
 * deserves to be told rather than left wondering why the extension went quiet.
 */
function looksLikeSelectorDrift(report: EnhancementReport): boolean {
  const MEANINGFUL_SAMPLE = 3;
  return (
    report.cards >= MEANINGFUL_SAMPLE &&
    report.badged === 0 &&
    report.unchanged === 0 &&
    report.skipped['no-price'] === report.cards
  );
}
