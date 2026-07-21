import type { SquareMetres } from '../types';
import { parseFrenchNumber } from './number';

/**
 * Matches a surface written either the way the card title renders it (`55m²`)
 * or the way the accessible label spells it out (`55 mètres carrés`).
 *
 * The figure is bounded to five digits with at most two decimals: surfaces are
 * never grouped with thousands separators on leboncoin, so allowing spaces
 * inside the number would let the pattern swallow the neighbouring room count.
 */
const AREA = /(\d{1,5}(?:[.,]\d{1,2})?)\s*(?:m²|m2|mètres?\s+carrés?)/i;

/** Below this, the figure is a balcony, a cellar, or a parsing accident. */
const MIN_CREDIBLE_AREA: SquareMetres = 5;

/** Above this, we are looking at a plot of land, not living space. */
const MAX_CREDIBLE_AREA: SquareMetres = 10_000;

/**
 * Extracts a floor area from free text.
 *
 * Returns `null` for ads that carry no surface at all (parking spaces, garages,
 * "viager" listings), which is a perfectly ordinary outcome — roughly one card
 * in ten on a mixed search page.
 */
export function parseArea(text: string): SquareMetres | null {
  const match = AREA.exec(text);
  if (!match?.[1]) return null;

  const value = parseFrenchNumber(match[1]);
  if (value === null || value < MIN_CREDIBLE_AREA || value > MAX_CREDIBLE_AREA) return null;

  return value;
}
