# 2. Adopt WXT for cross-browser builds

- **Status:** accepted
- **Date:** 2026-07-21

## Context

The extension has to run in Chrome and Firefox. The WebExtensions API is close
to identical across both, but the packaging is not: Chrome's MV3 wants a service
worker, Firefox's wants an event page; `browser_specific_settings` is required
by one and rejected by the other's review process; the `chrome.*` namespace is
callback-based while `browser.*` is promise-based.

None of this is hard. All of it is tedious, and every hour spent on it is an
hour not spent on the thing the extension actually does.

The options considered:

1. **Hand-rolled build** — a manifest generator, a bundler config, and
   `webextension-polyfill`. Total control, no dependencies to track, and a
   permanent tax on every change.
2. **Plasmo** — batteries included, React-first, opinionated file conventions.
   More framework than a single badge justifies, and its conventions are hard to
   back out of once entrypoints depend on them.
3. **WXT** — Vite-based, generates a per-target manifest from one config,
   auto-detects entrypoints, ships HMR for content scripts.

## Decision

Use WXT.

Concretely, it earns its place through: `manifest: ({ browser }) => …`, so the
one genuine difference between targets is four lines in `wxt.config.ts`;
`wxt zip -b firefox`, which produces the sources archive AMO requires without a
separate script; and content-script HMR, which turns the edit-reload-rescroll
loop into an edit loop.

## Consequences

A build dependency now sits between the source and the artefact, and the project
inherits its release cadence and its bugs. That is the trade: the alternative is
maintaining the same logic ourselves, worse.

The blast radius is contained by design. WXT appears in `wxt.config.ts`, in the
`defineContentScript` wrapper, and behind `platform/`. Everything below that —
`core/`, `site/`, `ui/`, `app/` — is plain TypeScript against plain DOM types.
Replacing the build tool would be a day's work, not a rewrite.
