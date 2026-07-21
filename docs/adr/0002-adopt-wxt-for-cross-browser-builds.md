# 2. Adopt WXT for cross-browser builds

- **Status:** accepted
- **Date:** 2026-07-21

## Context

The extension has to run in Chrome and Firefox. The WebExtensions API is close
to identical across both. The packaging is not. Chrome's MV3 wants a service
worker, Firefox's wants an event page. `browser_specific_settings` is required
by one and rejected by the other's review process. The `chrome.*` namespace is
callback based, `browser.*` is promise based.

None of that is hard. All of it is tedious, and every hour spent on it is an
hour not spent on what the extension actually does.

Options considered:

1. **Hand-rolled build.** A manifest generator, a bundler config, and
   `webextension-polyfill`. Full control, nothing to track, and a permanent tax
   on every change.
2. **Plasmo.** Batteries included, React first, opinionated file conventions.
   More framework than a single badge justifies, and the conventions are hard to
   back out of once entrypoints depend on them.
3. **WXT.** Vite based, generates a per-target manifest from one config, finds
   entrypoints by convention, ships HMR for content scripts.

## Decision

Use WXT.

Three things earn it a place. `manifest: ({ browser }) => ...` keeps the one
real difference between targets down to four lines in `wxt.config.ts`.
`wxt zip -b firefox` produces the sources archive AMO requires without a
separate script. Content-script HMR turns the edit, reload, re-scroll loop into
an edit loop.

## Consequences

A build dependency now sits between the source and the artefact, so the project
inherits its release cadence and its bugs. That is the trade. The alternative is
maintaining the same logic ourselves, worse.

The blast radius stays small. WXT appears in `wxt.config.ts`, in the
`defineContentScript` wrapper, and behind `platform/`. Everything below that
(`core/`, `site/`, `ui/`, `app/`) is plain TypeScript against plain DOM types.
Replacing the build tool would be a day of work rather than a rewrite.
