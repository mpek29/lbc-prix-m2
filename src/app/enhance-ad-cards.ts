import { formatPricePerArea } from '@/core/format';
import { computePricePerArea } from '@/core/price-per-area';
import { findAdCards, readAdCard, type SkipReason } from '@/site/leboncoin/read-ad-card';
import { createPriceBadge, findBadgeIn, findBadges, isBadge, labelOf } from '@/ui/price-badge';

/** Why a card ended a pass without a badge. `implausible` is our own veto. */
export type Outcome = SkipReason | 'implausible';

export interface EnhancementReport {
  /** Ad cards found in the document. */
  readonly cards: number;
  /** Badges inserted or refreshed during this pass. */
  readonly badged: number;
  /** Cards that already carried the right badge, and were left alone. */
  readonly unchanged: number;
  /** Cards that legitimately produced no figure, by reason. */
  readonly skipped: Readonly<Record<Outcome, number>>;
}

/**
 * Walks every ad card in the document and makes the page match the data.
 *
 * The pass is deliberately stateless: nothing is remembered between calls, and
 * the decision to act is taken by comparing what the card shows against what it
 * should show. That is what makes it safe to run on every mutation — and what
 * makes it self-healing when leboncoin recycles a DOM node for a different ad,
 * which React does constantly during infinite scroll.
 */
export function enhanceAdCards(doc: Document): EnhancementReport {
  const cards = findAdCards(doc);
  const skipped: Record<Outcome, number> = { 'no-price': 0, 'no-area': 0, implausible: 0 };
  let badged = 0;
  let unchanged = 0;

  for (const card of cards) {
    // The adapter reads leboncoin's DOM; telling it which nodes are ours is
    // what keeps a second pass from parsing the first pass's output.
    const reading = readAdCard(card, { isInjected: isBadge });

    if (reading.kind === 'skipped') {
      discardBadge(card);
      skipped[reading.reason] += 1;
      continue;
    }

    const value = computePricePerArea(reading.listing.price, reading.listing.area);
    if (value === null) {
      discardBadge(card);
      skipped.implausible += 1;
      continue;
    }

    if (applyBadge(doc, card, reading.priceAnchor, value)) badged += 1;
    else unchanged += 1;
  }

  return { cards: cards.length, badged, unchanged, skipped };
}

/** Takes the page back to how leboncoin served it. */
export function removeAllBadges(doc: Document): number {
  const badges = findBadges(doc);
  for (const badge of badges) badge.remove();
  return badges.length;
}

/**
 * @returns `true` when the DOM was written to, `false` when the card already
 * showed the right thing in the right place.
 */
function applyBadge(doc: Document, card: Element, anchor: Element, value: number): boolean {
  const existing = findBadgeIn(card);
  const label = formatPricePerArea(value);

  // Both halves matter. The label catches a card whose data changed; the anchor
  // catches a card whose price element was re-rendered underneath our badge,
  // leaving it stranded somewhere it no longer belongs.
  if (existing && labelOf(existing) === label && existing.previousElementSibling === anchor) {
    return false;
  }

  existing?.remove();
  anchor.after(createPriceBadge(doc, value));
  return true;
}

function discardBadge(card: Element): void {
  findBadgeIn(card)?.remove();
}
