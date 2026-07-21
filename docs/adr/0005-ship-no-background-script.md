# 5. Ship no background script

- **Status:** accepted
- **Date:** 2026-07-21

## Context

Nearly every extension template includes a background entrypoint, and the
instinct is to keep it. Somewhere to set default settings on install, log
something, put things later.

This extension has no work that outlives a page. The content script reads the
DOM in front of it and writes to it. The popup reads and writes one storage key.
Neither needs a coordinator, and the `fallback` option on
`storage.defineItem` already covers "set defaults on install" without any code
running.

## Decision

No background entrypoint. Neither manifest has a `background` key.

## Consequences

Chrome registers no service worker for an extension that does nothing, and
Firefox creates no event page. One fewer artefact in the bundle, one fewer
MV2/MV3 lifecycle difference to reason about, one fewer thing for a store
reviewer to ask about.

If a background script is ever needed, say for a context menu, a browser action
that works off-site, or cross-tab coordination, WXT makes adding
`src/entrypoints/background.ts` a one-file change. Adding it before there is work
for it to do just ships an idle worker.
