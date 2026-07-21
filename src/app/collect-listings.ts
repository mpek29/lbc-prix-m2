import { computePricePerArea } from '@/core/price-per-area';
import type { EurosPerSquareMetre } from '@/core/types';
import { findAdCards, readAdCard } from '@/site/leboncoin/read-ad-card';
import { findCardItem } from '@/site/leboncoin/results-list';
import { isBadge } from '@/ui/price-badge';

/** Marks a card lifted out of a page the reader never navigated to. */
export const IMPORTED_MARKER = 'data-lbc-prix-m2-imported';

export interface CollectedAd {
  readonly id: string | null;
  readonly pricePerArea: EurosPerSquareMetre | null;
  /** The `<li>` to place in the list. */
  readonly item: Element;
  /** True when it came from a fetched page rather than the one on screen. */
  readonly imported: boolean;
}

/**
 * Reads every ad out of a document and prices it.
 *
 * The same adapter serves the live page and the pages we fetch, because
 * leboncoin server-renders its results: a fetched page arrives with all 35
 * cards already in the HTML, carrying the same `data-qa-id` and ARIA hooks. No
 * second parser, and no dependence on their internal JSON.
 *
 * @param into the document the items must end up in. Cards from a fetched
 * document belong to that document and have to be imported before they can be
 * inserted anywhere.
 */
export function collectFrom(source: ParentNode, into: Document): CollectedAd[] {
  const collected: CollectedAd[] = [];

  for (const card of findAdCards(source)) {
    const item = findCardItem(card);
    if (!item) continue;

    const reading = readAdCard(card, { isInjected: isBadge });
    const pricePerArea =
      reading.kind === 'listing'
        ? computePricePerArea(reading.listing.price, reading.listing.area)
        : null;
    const id = reading.kind === 'listing' ? reading.listing.id : null;

    const foreign = item.ownerDocument !== into;
    const placed = foreign ? (into.importNode(item, true) as Element) : item;
    if (foreign) placed.setAttribute(IMPORTED_MARKER, '');

    collected.push({ id, pricePerArea, item: placed, imported: foreign });
  }

  return collected;
}

/**
 * Merges pages, dropping ads already seen.
 *
 * leboncoin's relevance ranking is not a stable total order, so the same ad can
 * appear on two pages fetched seconds apart. Without this the reader sees
 * duplicates, which reads as a bug in the sort rather than in the source.
 */
export function mergeUnique(pages: readonly CollectedAd[][]): CollectedAd[] {
  const seen = new Set<string>();
  const merged: CollectedAd[] = [];

  for (const page of pages) {
    for (const ad of page) {
      if (ad.id !== null) {
        if (seen.has(ad.id)) continue;
        seen.add(ad.id);
      }
      merged.push(ad);
    }
  }

  return merged;
}
