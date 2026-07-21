# 5. Ship no background script

- **Status:** accepted
- **Date:** 2026-07-21

## Context

Nearly every extension template includes a background entrypoint, and the
instinct is to keep it — to set default settings on install, to log something, to
have somewhere to put things later.

This extension has no work that outlives a page. The content script reads the
DOM in front of it and writes to it. The popup reads and writes one storage key.
Neither needs a coordinator, and `storage.defineItem`'s `fallback` already
covers the "set defaults on install" case without any code running at all.

## Decision

No background entrypoint. The manifest has no `background` key on either target.

## Consequences

Chrome does not register a service worker for an extension that does nothing;
Firefox does not create an event page. One fewer artefact in the bundle, one
fewer MV2/MV3 lifecycle difference to reason about, and one fewer thing for a
store reviewer to ask about.

Should a background script ever be needed — a context menu, a browser action
that works off-site, cross-tab coordination — WXT makes adding
`src/entrypoints/background.ts` a one-file change. Adding it before there is
work for it to do only means shipping an idle worker and pretending it is
architecture.
