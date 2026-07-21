import type { EurosPerSquareMetre } from './types';

export type SortDirection = 'asc' | 'desc';

/** Anything carrying a price per square metre, or nothing if we could not read one. */
export interface RankedByArea {
  readonly pricePerArea: EurosPerSquareMetre | null;
}

/**
 * Orders ads by price per square metre.
 *
 * Ads we could not price (parking spaces, "prix à débattre", anything with no
 * surface) always sink to the bottom, in both directions. Treating a missing
 * figure as zero would put every parking space at the top of "croissant", and
 * treating it as infinity would do the same to "décroissant". Neither is what
 * the reader asked for, and both look like the sort is broken.
 *
 * The sort is stable, so ties and unpriceable ads keep the order leboncoin's
 * own ranking gave them.
 *
 * @returns a new array. The input is left alone.
 */
export function sortByPricePerArea<T extends RankedByArea>(
  items: readonly T[],
  direction: SortDirection,
): T[] {
  const sign = direction === 'asc' ? 1 : -1;

  return [...items].sort((a, b) => {
    if (a.pricePerArea === null) return b.pricePerArea === null ? 0 : 1;
    if (b.pricePerArea === null) return -1;
    return sign * (a.pricePerArea - b.pricePerArea);
  });
}
