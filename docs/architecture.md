# Architecture

## The problem

This extension does arithmetic. Divide a price by a surface, print the result.

The hard part is not the calculation. It is that both inputs have to be
recovered from someone else's HTML, and that HTML is rewritten by a team who has
never heard of us.

Most of the design follows from that. The arithmetic will never break. The
reading will break repeatedly, so the architecture exists to make sure that when
it does, only one directory changes.

## The layers

```
        ┌─────────────────────────────────────────────────┐
        │  entrypoints/   content script · popup           │  ~30 lines each
        └───────────────────────┬─────────────────────────┘
                                │
        ┌───────────────────────▼─────────────────────────┐
        │  app/           the composition root             │
        └───┬───────────────────┬───────────────────┬─────┘
            │                   │                   │
   ┌────────▼──────┐   ┌────────▼──────┐   ┌────────▼──────┐
   │  site/        │   │  ui/          │   │  platform/    │
   │  reads their  │   │  writes our   │   │  browser APIs │
   │  DOM          │   │  DOM          │   │               │
   └────────┬──────┘   └────────┬──────┘   └───────────────┘
            │                   │
        ┌───▼───────────────────▼─────────────────────────┐
        │  core/          pure domain, no DOM, no browser  │
        └─────────────────────────────────────────────────┘
```

Dependencies point downward only, and this is enforced by `no-restricted-imports`
rules in [`eslint.config.js`](../eslint.config.js) rather than by convention. An
import from `core/` to `platform/` fails the build.

### `core/` (the domain)

Parsing French numbers, dividing, formatting. No `document`, no `browser`, no
knowledge that leboncoin exists. You could lift it into a Node script or an
extension for a different site without touching it.

It also holds the judgement calls. `computePricePerArea` refuses to return
500 000 €/m², because a figure that size means we matched the wrong surface. A
confident wrong number does more damage than no number.

### `site/leboncoin/` (the anti-corruption layer)

The only directory containing a CSS selector. Everything volatile is quarantined
here, so "leboncoin changed their markup" stays a one-directory diff.

Its output is a domain `Listing` plus one DOM node: the element the badge should
attach to. Returning a node rather than a selector keeps selector knowledge from
leaking upward.

It takes an `isInjected` predicate, which matters more than it looks. Once a
badge is on the page, part of the card belongs to us, and a reader that cannot
tell the difference will parse `11,6 €/m²` back out of its own output.

### `ui/` (our DOM)

Builds the badge. Everything is `createElement` and `textContent`. There is no
`innerHTML` anywhere in this project, and that is a rule, not a preference. A
content script that assembles markup from strings on a page it does not control
is one bad escape away from being the vulnerability.

The badge also paints its own background and uses fixed colours. It does not
follow `prefers-color-scheme`, for reasons documented at the top of
[`price-badge.css`](../src/ui/price-badge.css). That one already cost us a bug.

### `platform/` (the browser)

Storage, logging, mutation observation. Thin wrappers whose main job is to be
the only place importing `#imports`, so everything else stays testable in a
plain DOM.

### `app/` (composition)

Where the layers meet. `enhanceAdCards` is one stateless pass over the document.
`createEnhancer` gives it a lifecycle and hooks it to the observer.

### `entrypoints/` (shells)

Files WXT requires. They resolve the environment and hand it to `app/`. If an
entrypoint grows past a screen, something in it belongs in a layer below.

## Two decisions to know about

### The pass is stateless

`enhanceAdCards` remembers nothing between calls. It re-reads every card every
time, and decides whether to write by comparing the badge on the page against
the badge the data implies.

The obvious alternative is to mark a card as done and skip it next time. That is
faster and wrong. leboncoin is a React app doing infinite scroll: it recycles DOM
nodes, so the element you marked as "done, 11,6 €/m²" now describes a different
flat in a different city. Bookkeeping about a DOM you do not own goes stale
without telling you.

Comparing against reality costs a few hundred microseconds per pass and cannot
go stale. It also means the extension repairs itself, whatever state the page
ends up in.

### Selectors are ranked, not picked

`site/leboncoin/selectors.ts` documents three tiers (QA hooks, then ARIA, then
URL shapes) and never uses a class name. Where a single lookup could plausibly
fail, `read-ad-card.ts` tries strategies in order of confidence.

The test suite checks this directly. One test strips every `class` attribute
from a captured card and expects the reading to come out identical.

## Testing

| Layer          | Tested with                                       |
| -------------- | ------------------------------------------------- |
| `core/`        | Plain unit tests. Fast, exhaustive, no DOM.       |
| `site/`        | Real captured HTML in `__fixtures__/`.            |
| `ui/`          | happy-dom, asserting structure and accessibility. |
| `app/`         | A full results page assembled from fixtures.      |
| `entrypoints/` | Not tested. There is nothing in them to test.     |

The fixtures carry most of the weight. They are verbatim recordings of
leboncoin's DOM, and they are the only honest answer to "does this still work?"
When the site changes, a fresh capture turns a bug report into a failing test
before anyone touches code. See
[`__fixtures__/README.md`](../src/site/leboncoin/__fixtures__/README.md).

happy-dom will confirm a badge is in the DOM. It will not tell you the badge is
unreadable, that it wrapped onto its own line, or that a colour rule never
applied. `npm run harness` covers that gap by running the real code against the
captured cards in a real browser.

## What is missing on purpose

- **No background script.** Nothing needs to outlive the page. See [ADR 0005](adr/0005-ship-no-background-script.md).
- **No framework in the popup.** It has one checkbox. React would outweigh the feature.
- **No network layer.** There is nothing to fetch. This doubles as the privacy policy.
- **No i18n.** One French-language site, so the locale is a constant, in one file.
