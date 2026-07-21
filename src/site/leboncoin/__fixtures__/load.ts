import carouselRadiogroup from './carousel-radiogroup.html?raw';
import noArea from './ad-card-no-area.html?raw';
import noPrice from './ad-card-no-price.html?raw';
import rental from './ad-card-rental.html?raw';
import sale from './ad-card-sale.html?raw';
import sortRadiogroup from './sort-radiogroup.html?raw';

/**
 * Captures are imported with `?raw`, which hands back the file's bytes
 * verbatim, non-breaking spaces and all. Anything that parsed or re-serialised
 * the markup on the way in would quietly repair the very details these fixtures
 * exist to pin down.
 */
const CAPTURES = {
  'ad-card-rental': rental,
  'ad-card-sale': sale,
  'ad-card-no-area': noArea,
  'ad-card-no-price': noPrice,
  'sort-radiogroup': sortRadiogroup,
  'carousel-radiogroup': carouselRadiogroup,
} as const;

export type FixtureName = keyof typeof CAPTURES;

export function fixture(name: FixtureName): string {
  return CAPTURES[name];
}

/** Composes several captures into a results list, the way the page renders it. */
export function fixtureList(...names: FixtureName[]): string {
  return `<ul>${names.map(fixture).join('')}</ul>`;
}
