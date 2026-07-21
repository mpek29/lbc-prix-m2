# Contributing

## Setup

```bash
nvm use          # or any Node ≥ 20.12
npm ci           # runs `wxt prepare`, which generates .wxt/ types
npm run dev      # Chrome + hot reload, opens a leboncoin search
```

`npm run verify` runs exactly what CI runs. If it passes locally it passes in CI.

## Where code goes

Read [docs/architecture.md](docs/architecture.md) first — it is short. The one
rule that matters: dependencies point inward, and ESLint will tell you if they
do not.

| If you are changing…                          | Go to                 |
| --------------------------------------------- | --------------------- |
| how a number is parsed, computed or formatted | `src/core/`           |
| where a value is found in leboncoin's HTML    | `src/site/leboncoin/` |
| what the badge looks like                     | `src/ui/`             |
| storage, logging, observing                   | `src/platform/`       |
| how the pieces fit together                   | `src/app/`            |

If a change needs a CSS selector outside `src/site/`, the change is in the wrong
place.

## The extension stopped working

Almost certainly leboncoin changed their markup. The fix has a fixed shape, and
the order matters:

1. **Capture first.** Open a search page, inspect an ad card, copy the enclosing
   `<li>` as `outerHTML`, and save it into
   [`src/site/leboncoin/__fixtures__/`](src/site/leboncoin/__fixtures__/)
   following the rules in the README there.
2. **Get a red test.** Point a test at the new capture. It should fail for the
   same reason the extension does.
3. **Then fix `src/site/leboncoin/`.** Prefer extending the strategy chain over
   replacing a selector — old pages exist in caches, and the previous fixtures
   have to keep passing.
4. **Never edit a fixture to make a test pass.** A fixture is a recording. If it
   disagrees with the code, the code is wrong, or the site moved and you need a
   fresh recording.

If your fix required a class name, please explain why in the PR — see
[ADR 0004](docs/adr/0004-prefer-accessibility-hooks-over-css-class-names.md).

## Tests

Every layer is tested at the level that can actually catch its bugs:

- `core/` — plain unit tests, no DOM, exhaustive on edge cases
- `site/` — against captured HTML, never against hand-written markup
- `ui/` — structure and accessibility, in happy-dom
- `app/` — a whole results page assembled from fixtures

`core/` is held to 95% statement coverage by
[`vitest.config.ts`](vitest.config.ts). The other layers are not, on purpose:
coverage of glue code measures the tests, not the code.

### Seeing it, without leboncoin

```bash
npm run harness    # → http://localhost:5177
```

Serves the captured cards with the real enhancer running against them, in a real
browser. happy-dom will tell you a badge is in the DOM; it will not tell you the
badge is unreadable, wrapped onto its own line, or that a
`prefers-color-scheme` branch never applied.

`window.harness.stop()` in the console must leave the page exactly as leboncoin
served it, and `.start()` must put it back — a fast check that the extension
leaves no trace.

Use it for anything that changes `src/ui/`. Use a real leboncoin page before
tagging a release: the harness proves the badge renders, only the live site
proves the selectors still match.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/), enforced by
commitlint on `commit-msg`. Scopes are restricted to the layer names plus
`build`, `ci`, `docs` and `deps` — see
[`commitlint.config.js`](commitlint.config.js).

```
fix(site): read the price from the sr-only paragraph again
feat(core): accept surfaces written with a decimal comma
docs(adr): record why MV3 is used on Firefox
```

`husky` runs `lint-staged` on `pre-commit`, so formatting and lint are handled
before a commit exists rather than in review.

## Decisions

If a change reverses something in [docs/adr/](docs/adr/), or makes a choice
whose obvious alternative looks better from the outside, add an ADR. Records are
immutable — supersede, do not edit.

## Releasing

1. Update [CHANGELOG.md](CHANGELOG.md) and the version in `package.json`.
2. Tag `vX.Y.Z` and push it.
3. CI builds both targets, produces the Firefox sources archive AMO requires,
   and attaches everything to a GitHub release.
4. Upload to the Chrome Web Store and AMO by hand. Store credentials are
   deliberately not in CI.
