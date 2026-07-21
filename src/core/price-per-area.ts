import type { Euros, EurosPerSquareMetre, Listing, SquareMetres } from './types';

/**
 * Rentals sit around 10–40 €/m²/month, sales around 1 000–15 000 €/m². A result
 * outside this band is not a surprising listing, it is a misread page: a price
 * matched against the wrong surface, or a surface matched against a room count.
 * We would rather show nothing than show a confident wrong number.
 */
const CREDIBLE_RANGE = { min: 1, max: 50_000 } as const;

/**
 * Divides a price by a surface, refusing to answer when the result is not
 * believable.
 *
 * @returns the price per square metre, or `null` if the inputs do not produce a
 * figure worth putting in front of a user.
 */
export function computePricePerArea(price: Euros, area: SquareMetres): EurosPerSquareMetre | null {
  if (!Number.isFinite(price) || !Number.isFinite(area)) return null;
  if (price <= 0 || area <= 0) return null;

  const value = price / area;
  if (value < CREDIBLE_RANGE.min || value > CREDIBLE_RANGE.max) return null;

  return value;
}

/** Convenience overload for a whole listing. */
export function pricePerAreaOf(listing: Listing): EurosPerSquareMetre | null {
  return computePricePerArea(listing.price, listing.area);
}
