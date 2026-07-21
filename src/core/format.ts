import type { EurosPerSquareMetre } from './types';

/**
 * The extension only ever runs on leboncoin.fr, which is a French-language
 * site, so the locale is a constant rather than a setting. If that ever stops
 * being true, this is the one place that has to change.
 */
const LOCALE = 'fr-FR';

/**
 * Below this, a single decimal carries real information (11,6 vs 12,4 €/m² is a
 * meaningful gap on a rental). Above it, decimals are noise: nobody compares
 * flats on 3 192,31 vs 3 192,45 €/m².
 */
const DECIMAL_THRESHOLD = 100;

const withDecimal = new Intl.NumberFormat(LOCALE, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const rounded = new Intl.NumberFormat(LOCALE, {
  maximumFractionDigits: 0,
});

/** `11,6` / `3 192` — the figure alone, without a unit. */
export function formatAmount(value: EurosPerSquareMetre): string {
  return value < DECIMAL_THRESHOLD ? withDecimal.format(value) : rounded.format(value);
}

/** `11,6 €/m²` — what the badge shows. */
export function formatPricePerArea(value: EurosPerSquareMetre): string {
  return `${formatAmount(value)} €/m²`;
}

/**
 * `Prix au mètre carré : 11,6 €.` — what a screen reader announces.
 *
 * Spelled out rather than symbolic, mirroring the `sr-only` paragraphs
 * leboncoin already places beside every `aria-hidden` price.
 */
export function describePricePerArea(value: EurosPerSquareMetre): string {
  return `Prix au mètre carré : ${formatAmount(value)} euros.`;
}
