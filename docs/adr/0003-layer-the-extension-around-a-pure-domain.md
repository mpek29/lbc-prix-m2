# 3. Layer the extension around a pure domain

- **Status:** accepted
- **Date:** 2026-07-21

## Context

The extension is roughly six hundred lines. Ports-and-adapters layering on six
hundred lines looks like over-engineering, and for most programs that size it
would be.

What makes this one different is where the risk sits. The arithmetic is trivial
and permanent. The DOM reading is trivial and doomed: leboncoin ships a new
build regularly, and each one is a chance for the extension to stop working. The
two kinds of code have completely different lifespans. Mixing them means editing
the stable code every time the volatile code breaks.

The alternative is one `content.ts` that queries, parses, computes and inserts.
That version is shorter. It is also untestable without a browser, and it puts
the thing that changes weekly in the same function as the thing that never
changes.

## Decision

Five layers, dependencies pointing inward only:

| Layer       | Owns                            | Changes when          |
| ----------- | ------------------------------- | --------------------- |
| `core/`     | Parsing, arithmetic, formatting | Never                 |
| `site/`     | leboncoin's DOM                 | leboncoin ships       |
| `ui/`       | Our injected DOM                | We redesign the badge |
| `platform/` | Browser APIs                    | The browser changes   |
| `app/`      | Composition                     | The feature changes   |

`no-restricted-imports` rules per directory in `eslint.config.js` enforce it, and
`core/` additionally treats `document`, `window`, `localStorage` and `fetch` as
restricted globals. A rule that cannot be broken beats a rule everyone agrees
with.

## Consequences

**What it buys.** `core/` is tested thoroughly in microseconds with no DOM. When
leboncoin changes, one directory is touched and the regression test is a
captured HTML file. Reading a diff, the layer tells you the risk before you read
the code.

**What it costs.** More files than the feature strictly needs, plus one extra
indirection: the `isInjected` predicate threaded from `app/` into `site/`, which
a single-file version would not have needed.

**Where it stops paying.** If this stays one content script forever, the layering
is ceremony. It stops being ceremony as soon as a second site or a second metric
turns up, because both slot in beside the existing ones instead of into the
middle of a function.
