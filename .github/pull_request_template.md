## What and why

<!-- What changes, and what problem it solves. Link the issue if there is one. -->

## Checklist

- [ ] `npm run verify` passes
- [ ] New behaviour is covered by a test at the layer that owns it
- [ ] Dependencies still point inward (ESLint enforces this, no boundary rules were relaxed)

## If this touches `src/site/leboncoin/`

- [ ] A fresh HTML capture was added to `__fixtures__/` and no existing capture was edited
- [ ] The old fixtures still pass, since cached pages exist in the wild
- [ ] No CSS class name was used, or the PR explains why one was unavoidable
      (see [ADR 0004](../docs/adr/0004-prefer-accessibility-hooks-over-css-class-names.md))

## If this reverses a decision

- [ ] A superseding ADR was added to `docs/adr/` (existing records are immutable)
