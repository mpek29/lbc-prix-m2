/**
 * Everything this project knows about leboncoin's markup lives in this file and
 * its neighbours. Nothing else in the codebase may contain a CSS selector.
 *
 * ## Why the selectors look like this
 *
 * leboncoin ships CSS Modules and Tailwind. Class names such as
 * `styles_adCard__9GEgr` or `adcard_e0b68b917` contain a content hash that
 * changes on every deploy, sometimes weekly. An extension that keys off them
 * is broken by construction; it just does not know it yet.
 *
 * So we bind to what the site cannot change without changing its own behaviour:
 *
 *   Tier 1: `data-qa-id` attributes. The site's own test hooks. Renaming one
 *            breaks leboncoin's test suite, so they are effectively frozen.
 *   Tier 2: ARIA and accessibility structure (`aria-label`, `aria-hidden`,
 *            `.sr-only`). Renaming these breaks screen readers and their
 *            accessibility audit.
 *   Tier 3: URL shapes (`/ad/<category>/<id>`). Part of the public contract.
 *
 * Class names appear nowhere. When a lookup can plausibly fail, it is expressed
 * as a strategy chain in `read-ad-card.ts` rather than as a single brittle
 * string here.
 *
 * @see docs/adr/0004-prefer-accessibility-hooks-over-css-class-names.md
 */

/** Tier 1: the root of a single ad card in the results list. */
export const AD_CARD = '[data-qa-id="aditem_container"]';

/** Tier 3: the canonical link to the ad, present on every card. */
export const AD_LINK = 'a[href*="/ad/"]';

/** Tier 2: text rendered for assistive technology only. */
export const SCREEN_READER_TEXT = '.sr-only';

/** Tier 2: the visual half of leboncoin's dual-rendering a11y pattern. */
export const VISUAL_ONLY = '[aria-hidden="true"]';

/** Tier 2: any element carrying an accessible name we might read a figure from. */
export const LABELLED = '[aria-label]';

/** Tier 3: `/ad/locations/3218511921` → `3218511921`. */
export const AD_ID_IN_HREF = /\/ad\/[^/]+\/(\d+)/;

/**
 * Tier 2: leboncoin prefixes its screen-reader price sentence with this word:
 * `<p class="sr-only">Prix: 640 €.</p>`.
 */
export const PRICE_SENTENCE_PREFIX = /^\s*prix\s*:/i;
