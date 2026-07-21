# 6. Target Manifest V3 on both browsers

- **Status:** accepted
- **Date:** 2026-07-21

## Context

WXT defaults to MV3 for Chrome and MV2 for Firefox, which is the conservative
choice: Firefox supported MV2 for far longer, and MV2 still works there.

Two manifest versions means two shapes of the same extension. Even for a project
with no background script — where most of the MV2/MV3 divergence lives — it
means the artefact that gets tested is not quite the artefact that ships to the
other store.

Firefox has supported MV3 since version 109 (January 2023). The oldest ESR still
receiving security updates is well past that.

## Decision

`manifestVersion: 3` in `wxt.config.ts`, for both targets, with
`strict_min_version: "115.0"` declared for Gecko.

## Consequences

One manifest shape, one thing to reason about, and the Chrome build and the
Firefox build differ only in `browser_specific_settings`.

The cost is users on Firefox older than 115 — a version released in July 2023,
and the current ESR baseline. They will not be offered the extension. That is a
narrower audience than "Firefox users", and a much narrower problem than
maintaining two manifest generations.

Should Firefox's MV3 implementation turn out to lack something we need, reverting
is a one-line config change plus whatever that missing thing was.
