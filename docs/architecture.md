# Architecture

## The problem, stated honestly

This extension does arithmetic. Divide a price by a surface, print the result.
The interesting part is not the calculation — it is that both inputs have to be
recovered from someone else's HTML, and that HTML is rewritten by a team who has
never heard of us and owes us nothing.

Every design decision here follows from that. The arithmetic will never break.
The reading will, repeatedly, and the job of the architecture is to make sure
that when it does, exactly one directory changes.

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
        │  core/          pure domain — no DOM, no browser │
        └─────────────────────────────────────────────────┘
```

Dependencies point downward only. This is enforced by `no-restricted-imports`
rules in [`eslint.config.js`](../eslint.config.js), not by good intentions: an
import from `core/` to `platform/` fails the build.

### `core/` — the domain

Parsing French numbers, dividing, formatting. No `document`, no `browser`, no
knowledge that leboncoin exists. It could be lifted into a Node script or a
different site's extension unchanged.

It is also where the judgement lives. `computePricePerArea` refuses to return
500 000 €/m² because that figure is not a bargain, it is a misread page —
and a confident wrong number is worse than no number.

### `site/leboncoin/` — the anti-corruption layer

The only directory that contains a CSS selector. Everything volatile is
quarantined here, so "leboncoin changed their markup" is a one-directory diff.

Its output is a domain `Listing` plus one DOM node — the element the badge
should attach to. Handing the caller a node rather than a selector is what
stops selector knowledge from leaking upward.

It takes an `isInjected` predicate, which is less incidental than it looks: once
a badge is on the page, part of the card is ours, and a reader that cannot tell
the difference will parse `11,6 €/m²` back out of its own output.

### `ui/` — our DOM

Builds the badge. Everything is `createElement` and `textContent`; there is no
`innerHTML` anywhere in this project, and that is a rule rather than a
preference. A content script that assembles markup from strings on a page it
does not control is one bad escape away from being the vulnerability.

### `platform/` — the browser

Storage, logging, mutation observation. Thin wrappers whose real purpose is to
be the only place that imports `#imports`, so everything else stays testable in
a plain DOM.

### `app/` — composition

Where the layers meet. `enhanceAdCards` is one stateless pass over the document;
`createEnhancer` gives it a lifecycle and hooks it to the observer.

### `entrypoints/` — shells

WXT-mandated files. They resolve the environment and hand it to `app/`. Nothing
else. If an entrypoint grows past a screen, something belongs in a layer below.

## Two decisions worth understanding

### The pass is stateless

`enhanceAdCards` remembers nothing between calls. It re-reads every card, every
time, and decides whether to write by comparing the badge on the page against
the badge the data implies.

The obvious alternative — mark a card as done, skip it next time — is faster and
wrong. leboncoin is a React application doing infinite scroll: it recycles DOM
nodes, so the element you marked as "done, 11,6 €/m²" is now describing a
different flat in a different city. Bookkeeping about a DOM you do not own is
bookkeeping that goes stale without telling you.

Comparing against reality costs a few hundred microseconds per pass and cannot
go stale by construction. It also means the extension repairs itself: whatever
state the page ends up in, the next pass corrects it.

### Selectors are ranked, not chosen

`site/leboncoin/selectors.ts` documents three tiers — QA hooks, then ARIA, then
URL shapes — and never uses a class name. Where a single lookup could plausibly
fail, `read-ad-card.ts` tries strategies in order of confidence instead.

The test suite asserts this directly: one test strips every `class` attribute
from a captured card and expects the reading to be unchanged.

## Testing

| Layer          | Tested with                                       |
| -------------- | ------------------------------------------------- |
| `core/`        | Plain unit tests. Fast, exhaustive, no DOM.       |
| `site/`        | Real captured HTML in `__fixtures__/`.            |
| `ui/`          | happy-dom, asserting structure and accessibility. |
| `app/`         | A full results page assembled from fixtures.      |
| `entrypoints/` | Not tested. There is nothing in them to test.     |

The fixtures are the load-bearing part. They are verbatim recordings of
leboncoin's DOM, and they are the only honest answer to "does this still work?"
When the site changes, a fresh capture turns a bug report into a failing test
before a line of code is touched. See
[`__fixtures__/README.md`](../src/site/leboncoin/__fixtures__/README.md).

## What is deliberately absent

- **No background script.** Nothing needs to outlive the page. See [ADR 0005](adr/0005-ship-no-background-script.md).
- **No framework in the popup.** One checkbox. React would be more code than the feature.
- **No network layer.** There is nothing to fetch. This is also the privacy policy.
- **No i18n.** The extension runs on one French-language site. The locale is a constant, in exactly one file.
