# 4. Prefer accessibility hooks over CSS class names

- **Status:** accepted
- **Date:** 2026-07-21

## Context

The obvious way to find the price on a leboncoin ad card is to copy the selector
out of devtools:

```css
.adcard_130463226 .text-callout
```

That works until the next deploy. `adcard_130463226` and
`styles_adCard__9GEgr` are CSS Modules output: the suffix is a content hash of
the stylesheet, so it changes whenever anyone edits the CSS — for reasons
entirely unrelated to the markup we care about. The Tailwind utilities alongside
them (`text-callout`, `gap-sm`) are stabler but still presentational, and get
swapped during any redesign.

Meanwhile the same card carries markup that leboncoin cannot casually change:

```html
<article aria-label="Appartement, 3 pièces, 55 mètres carrés.">
  <div data-qa-id="aditem_container">
    <a href="/ad/locations/3218511921">Voir l’annonce</a>
    <p aria-hidden="true"><span>640 €</span></p>
    <p class="sr-only">Prix: 640 €.</p>
  </div>
</article>
```

`data-qa-id` is their own test hook — renaming it breaks their test suite. The
`aria-label` and `.sr-only` sentences are what screen readers announce —
renaming them breaks their accessibility compliance. Both are load-bearing for
leboncoin, which is precisely what makes them safe for us.

## Decision

Bind to three tiers, in order of confidence, and never to a class name:

1. **`data-qa-id` attributes** — the site's own test hooks.
2. **ARIA and accessibility structure** — `aria-label`, `aria-hidden`,
   `.sr-only`.
3. **URL shapes** — `/ad/<category>/<id>`, part of the public contract.

Where a single lookup could plausibly fail, `read-ad-card.ts` tries strategies in
order rather than betting on one: the price comes from the screen-reader
sentence if there is one, from the `aria-hidden` visual element otherwise. The
surface comes from the article's accessible name, then any nested one, then the
card's text.

The bet is asserted, not just stated. One test strips every `class` attribute
from a captured card and expects the reading to be identical.

## Consequences

Selectors survive restyles, which is where most of the breakage would otherwise
come from. Reading through the accessibility layer also tends to give _better_
data — `"Prix: 640 €."` is unambiguous in a way that scraping text near a euro
sign is not.

Two costs. Strategy chains are more code than one `querySelector`, and reading
`.sr-only` text means our own injected content is visible to the next read —
which is why `readAdCard` takes an `isInjected` predicate.

One residual risk: leboncoin could ship an accessibility regression that removes
these hooks. That would break us. It would also be a bug on their side, and the
fallback chain degrades one step at a time rather than failing outright.
