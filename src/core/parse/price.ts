import type { Euros } from '../types';
import { parseFrenchNumber } from './number';

/**
 * Matches the figure attached to a euro sign.
 *
 * Deliberately anchored on the currency symbol rather than on "the first number
 * in the string": ad card text is full of other numbers (room counts, floors,
 * surfaces), and the euro sign is the one unambiguous marker.
 */
const PRICE = /(\d[\d\s.]*(?:,\d{1,2})?)\s*(?:€|EUR\b)/i;

/**
 * A price below this is a placeholder ("1 €" auctions, "0 €" standing in for
 * "nous consulter"), not something worth dividing by a surface.
 */
const MIN_CREDIBLE_PRICE: Euros = 10;

/**
 * Extracts a price from free text such as `"Prix: 1 250 €."` or `"640 €"`.
 *
 * Returns `null` when there is no credible price to be found — including for
 * ads that display "Prix à débattre" or nothing at all.
 */
export function parsePrice(text: string): Euros | null {
  const match = PRICE.exec(text);
  if (!match?.[1]) return null;

  const value = parseFrenchNumber(match[1]);
  if (value === null || value < MIN_CREDIBLE_PRICE) return null;

  return value;
}
