# Contributing

## Setup

```bash
nvm use          # or any Node >= 20.12
npm ci           # runs `wxt prepare`, which generates the .wxt/ types
npm run dev      # Chrome + hot reload, opens a leboncoin search
```

`npm run verify` runs what CI runs. If it passes locally it passes in CI.

## Where code goes

Read [docs/architecture.md](docs/architecture.md) first, it is short. The rule
that matters: dependencies point inward, and ESLint will tell you when they do
not.

| If you are changing...                        | Go to                 |
| --------------------------------------------- | --------------------- |
| how a number is parsed, computed or formatted | `src/core/`           |
| where a value is found in leboncoin's HTML    | `src/site/leboncoin/` |
| what the badge looks like                     | `src/ui/`             |
| storage, logging, observing                   | `src/platform/`       |
| how the pieces fit together                   | `src/app/`            |

If a change needs a CSS selector outside `src/site/`, it is in the wrong place.

## The extension stopped working

Almost certainly leboncoin changed their markup. The fix has a fixed shape, and
the order matters:

1. **Capture first.** Open a search page, inspect an ad card, copy the enclosing
   `<li>` as `outerHTML`, and save it into
   [`src/site/leboncoin/__fixtures__/`](src/site/leboncoin/__fixtures__/)
   following the rules in the README there.
2. **Get a red test.** Point a test at the new capture. It should fail for the
   same reason the extension does.
3. **Then fix `src/site/leboncoin/`.** Extend the strategy chain rather than
   replacing a selector. Old pages exist in caches, and the previous fixtures
   have to keep passing.
4. **Never edit a fixture to make a test pass.** A fixture is a recording. If it
   disagrees with the code, either the code is wrong or the site moved and you
   need a fresh recording.

If your fix needed a class name, say why in the PR. See
[ADR 0004](docs/adr/0004-prefer-accessibility-hooks-over-css-class-names.md).

## Tests

Each layer is tested at the level that can catch its own bugs:

- `core/`: plain unit tests, no DOM, thorough on edge cases
- `site/`: against captured HTML, never against hand-written markup
- `ui/`: structure and accessibility, in happy-dom
- `app/`: a whole results page assembled from fixtures

`core/` is held to 95% statement coverage by
[`vitest.config.ts`](vitest.config.ts). The other layers are not. Coverage of
glue code mostly measures the tests.

### Seeing it, without leboncoin

```bash
npm run harness    # → http://localhost:5177
```

Serves the captured cards with the real enhancer running against them, in a real
browser. happy-dom will confirm a badge is in the DOM. It will not tell you the
badge is unreadable, that it wrapped onto its own line, or that a colour rule
never applied.

`window.harness.stop()` in the console should leave the page exactly as
leboncoin served it, and `.start()` should put it back. Quick way to check the
extension leaves no trace.

Use the harness for anything touching `src/ui/`. Use a real leboncoin page
before tagging a release: the harness proves the badge renders, only the live
site proves the selectors still match.

## Writing

Docs and comments are checked by `npm run lint:prose`, which fails on em dashes
and a short list of filler words. See [tools/lint-prose.mjs](tools/lint-prose.mjs)
for the list and the reasoning. Short sentences, plain punctuation, no
flourishes.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), enforced by
commitlint on `commit-msg`. Scopes are limited to the layer names plus `build`,
`ci`, `docs` and `deps`. See [`commitlint.config.js`](commitlint.config.js).

```
fix(site): read the price from the sr-only paragraph again
feat(core): accept surfaces written with a decimal comma
docs(adr): record why MV3 is used on Firefox
```

`husky` runs `lint-staged` on `pre-commit`, so formatting and lint are sorted
out before a commit exists rather than during review.

## Decisions

If a change reverses something in [docs/adr/](docs/adr/), or picks an option
whose alternative looks better from the outside, add an ADR. Records are
immutable: supersede, do not edit.

## Releasing

1. Update [CHANGELOG.md](CHANGELOG.md) and the version in `package.json`.
2. Tag `vX.Y.Z` and push it.
3. CI builds both targets, produces the Firefox sources archive AMO needs, and
   attaches everything to a GitHub release.
4. Upload to the Chrome Web Store and AMO by hand. Store credentials are not
   held by CI. See [docs/publishing.md](docs/publishing.md) for both stores,
   and for signing a build you can install permanently without a listing.
