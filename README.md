# Prix au m² pour leboncoin

A browser extension that shows the price per square metre on every property ad
in a leboncoin search, next to the price leboncoin already prints.

```
640 €  [11,6 €/m²]      Appartement · 3 pièces · 55m² · Étage 1
```

That is the whole feature. It runs in Chrome and Firefox from one codebase, it
talks to no server, and it asks for one permission (`storage`, for a single
boolean).

## Install

**From source**

```bash
npm ci
npm run build          # → .output/chrome-mv3
npm run build:firefox  # → .output/firefox-mv3
```

- **Chrome** — `chrome://extensions` → Developer mode → _Load unpacked_ →
  `.output/chrome-mv3`
- **Firefox** — `about:debugging#/runtime/this-firefox` → _Load Temporary
  Add-on_ → `.output/firefox-mv3/manifest.json`

Firefox drops temporary add-ons when it restarts. For a permanent install the
package has to be signed by Mozilla — `npm run zip:firefox` produces both the
extension and the sources archive AMO asks for.

## Develop

```bash
npm run dev            # Chrome, hot reload
npm run dev:firefox    # Firefox, hot reload
npm run test:watch
npm run verify         # format + lint + typecheck + test — what CI runs
```

`npm run dev` opens a browser on a leboncoin rental search with the extension
loaded. Editing a file reloads it in place.

## How it works

leboncoin renders its results client-side and ships class names with a build
hash in them, so both halves of the obvious approach are traps: there is nothing
in the DOM when the content script runs, and the class you keyed off yesterday
is gone today.

So the extension does two things instead. It watches for mutations and re-runs a
stateless pass over the page whenever it changes. And it reads the page through
its accessibility layer — `data-qa-id` hooks, `aria-label` text, the `.sr-only`
sentences leboncoin writes for screen readers — none of which can be renamed
without breaking something the site itself cares about.

Each pass compares what a card shows against what it should show, and only
writes when they differ. That is what makes it safe to run on every mutation,
and what makes it self-correcting when React recycles a card's DOM node for a
different ad mid-scroll.

The full picture, and the reasoning behind each decision, is in
[docs/architecture.md](docs/architecture.md) and [docs/adr/](docs/adr/).

## Privacy

Nothing leaves your browser. There is no analytics, no error reporting, no
remote configuration, and no network request of any kind — the extension has no
host permissions beyond the page it is injected into, and the Firefox manifest
declares `data_collection_permissions: none`.

The only thing stored is whether you have the badges switched on, in
`storage.local` on your own machine.

## When it stops working

leboncoin will eventually change something. When they do, the extension notices:
if every card on a full page fails the same way, it logs a warning to the
console naming the problem rather than going quietly silent.

If you see that — or just see no badges — please
[open an issue](https://github.com/mpek29/lbc-prix-m2/issues/new?template=selector-drift.yml)
with a copy of one ad card's HTML. That capture goes straight into
[`src/site/leboncoin/__fixtures__/`](src/site/leboncoin/__fixtures__/) as a
regression test, which is the fastest possible path from "it broke" to "it
cannot break that way again".

## Licence

MIT — see [LICENSE](LICENSE).

This is an independent project. It is not affiliated with, endorsed by, or
connected to leboncoin.
