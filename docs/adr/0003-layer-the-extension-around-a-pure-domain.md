# 3. Layer the extension around a pure domain

- **Status:** accepted
- **Date:** 2026-07-21

## Context

The extension is roughly six hundred lines. Ports-and-adapters layering on six
hundred lines is, on its face, over-engineering — and for most six-hundred-line
programs it would be.

What makes this one different is the distribution of risk. The arithmetic is
trivial and permanent. The DOM reading is trivial and doomed: leboncoin ships a
new build regularly, and every one of them is a chance for the extension to stop
working. The two kinds of code have completely different lifespans, and mixing
them means the stable code gets edited every time the volatile code breaks.

The alternative — one `content.ts` that queries, parses, computes and inserts —
is genuinely shorter. It is also untestable without a browser, and it puts the
one thing that changes weekly in the same function as the one thing that never
changes at all.

## Decision

Five layers, dependencies pointing inward only:

| Layer       | Owns                            | Changes when          |
| ----------- | ------------------------------- | --------------------- |
| `core/`     | Parsing, arithmetic, formatting | Never                 |
| `site/`     | leboncoin's DOM                 | leboncoin ships       |
| `ui/`       | Our injected DOM                | We redesign the badge |
| `platform/` | Browser APIs                    | The browser changes   |
| `app/`      | Composition                     | The feature changes   |

The rule is enforced by `no-restricted-imports` rules per directory in
`eslint.config.js`, and `core/` additionally has `document`, `window`,
`localStorage` and `fetch` marked as restricted globals. A rule nobody can break
is worth more than a rule everybody agrees with.

## Consequences

**What it buys.** `core/` is tested exhaustively in microseconds with no DOM.
When leboncoin changes, exactly one directory is touched and the regression test
is a captured HTML file. Reviewing a diff, the layer tells you the risk before
you read the code.

**What it costs.** More files than the feature strictly needs, and one extra
indirection — the `isInjected` predicate threaded from `app/` into `site/` —
that a single-file version would not have needed at all.

**Where it would stop paying.** If this stayed a lone content script forever, the
layering would be ceremony. It stops being ceremony the moment a second site or
a second metric appears, because both slot in beside the existing ones instead
of into the middle of a function.
