/**
 * French number formatting is not a formality here: leboncoin renders prices
 * with a non-breaking space as the thousands separator and a comma as the
 * decimal mark. `Number('1 250')` is `NaN`, so every figure has to come through
 * this function.
 */

/**
 * `\s` already covers every flavour of space the site emits — U+00A0 for the
 * thousands separator, and the U+202F narrow no-break space that recent ICU
 * versions of `Intl.NumberFormat('fr-FR')` produce. Spelling those code points
 * out here would only add invisible characters to the source.
 */
const SPACE_LIKE = /\s/g;

/** `1.250` or `1.250.375` — dots used the way French typography uses spaces. */
const DOT_GROUPED = /^\d{1,3}(\.\d{3})+$/;

/** What is left once separators are normalised: digits, optionally one dot. */
const PLAIN_DECIMAL = /^\d+(\.\d+)?$/;

/**
 * Parses a French-formatted number.
 *
 * Returns `null` — never `NaN` — for anything it cannot read with confidence,
 * so callers cannot accidentally propagate a bad figure.
 */
export function parseFrenchNumber(raw: string): number | null {
  const compact = raw.replace(SPACE_LIKE, '');
  if (compact === '') return null;

  // Dots are ambiguous. When they appear in strict groups of three they are a
  // thousands separator; anywhere else we treat them as a decimal point, which
  // is what a copy-pasted or machine-generated figure usually means.
  const normalised = DOT_GROUPED.test(compact)
    ? compact.replace(/\./g, '')
    : compact.replace(',', '.');

  if (!PLAIN_DECIMAL.test(normalised)) return null;

  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}
