# Captured markup

These files are recordings of leboncoin's real DOM, taken from a search results
page. They are the contract this adapter is written against, and the only honest
way to know whether a selector still works.

## Rules

- **Do not hand-edit them to make a test pass.** If a test fails against a
  capture, either the adapter is wrong or the site changed. Both deserve a
  commit message rather than a tweaked fixture.
- **Do not let Prettier or an editor reformat them.** Whitespace inside the
  markup carries meaning: the price is rendered with a U+00A0 before the euro
  sign, and normalising it would delete the regression test for that. They are
  excluded in `.prettierignore` and `.gitattributes`.
- **Trimming is allowed, rewriting is not.** Carousels, inline `<style>` blocks
  and SVG paths were removed because they are large and irrelevant. Every
  attribute the adapter reads (`data-qa-id`, `aria-label`, `aria-hidden`,
  `.sr-only`, `href`) is preserved exactly as served.

## Refreshing a capture

1. Open a leboncoin search page in the browser.
2. Right-click an ad card, Inspect, select the enclosing `<li>`.
3. Copy, _Copy outerHTML_, paste into a new file here.
4. Delete the carousel, `<style>` and `<svg>` subtrees. Nothing else.
5. Run `npm test`. A newly failing test is the point of the exercise.

| File                    | Represents                                          |
| ----------------------- | --------------------------------------------------- |
| `ad-card-rental.html`   | 3-room flat, 640 € for 55 m², the happy path         |
| `ad-card-sale.html`     | A sale price in six figures, plus a decoy plot size  |
| `ad-card-no-area.html`  | A parking space: priced, but with no surface         |
| `ad-card-no-price.html` | A professional ad with the price withheld            |

`load.ts` reads them and can splice several into a `<ul>`, which is how tests
build a full results list without a fifth capture to keep in sync.
