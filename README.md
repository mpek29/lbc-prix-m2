# Prix au m² pour leboncoin

Browser extension that shows the price per square metre on every property ad in
a leboncoin search, right next to the price leboncoin already prints.

```
640 €  [11,6 €/m²]      Appartement · 3 pièces · 55m² · Étage 1
```

That is the whole feature. It runs in Chrome and Firefox from one codebase, it
talks to no server, and it asks for a single permission (`storage`, to remember
one boolean).

## Install

**From source**

```bash
npm ci
npm run build          # → .output/chrome-mv3
npm run build:firefox  # → .output/firefox-mv3
```

- **Chrome**: `chrome://extensions` → Developer mode → _Load unpacked_ →
  `.output/chrome-mv3`
- **Firefox**: `about:debugging#/runtime/this-firefox` → _Load Temporary Add-on_
  → `.output/firefox-mv3/manifest.json`

Firefox drops temporary add-ons when it restarts. A permanent install needs a
package signed by Mozilla. `npm run zip:firefox` produces the extension plus the
sources archive AMO asks for.

## Develop

```bash
npm run dev            # Chrome, hot reload
npm run dev:firefox    # Firefox, hot reload
npm run harness        # the captured cards, no extension install needed
npm run test:watch
npm run verify         # format + lint + typecheck + test, same as CI
```

`npm run dev` opens a browser on a leboncoin rental search with the extension
loaded. Editing a file reloads it in place.

## How it works

leboncoin renders its results client side and ships class names with a build
hash in them. Both halves of the obvious approach are therefore traps: there is
nothing in the DOM when the content script first runs, and the class you keyed
off yesterday is gone today.

So the extension does two things instead. It watches for mutations and re-runs a
stateless pass over the page whenever the page changes. And it reads through the
accessibility layer: `data-qa-id` hooks, `aria-label` text, the `.sr-only`
sentences leboncoin writes for screen readers. None of those can be renamed
without breaking something leboncoin itself relies on.

Each pass compares what a card shows against what it should show, and writes
only when the two differ. That makes it safe to run on every mutation, and it
means the extension corrects itself when React recycles a card's DOM node for a
different ad mid-scroll.

For the full picture and the reasoning behind each choice, see
[docs/architecture.md](docs/architecture.md) and [docs/adr/](docs/adr/).

## Privacy

Nothing leaves your browser. No analytics, no error reporting, no remote config,
no network request of any kind. The extension holds no host permissions beyond
the page it is injected into, and the Firefox manifest declares
`data_collection_permissions: none`.

The only thing stored is whether you have the badges switched on, in
`storage.local`, on your own machine.

## When it stops working

leboncoin will change something eventually. When they do, the extension notices.
If every card on a full page fails the same way, it logs a warning to the
console naming the problem instead of going quiet.

If you see that warning, or just see no badges,
[open an issue](https://github.com/mpek29/lbc-prix-m2/issues/new?template=selector-drift.yml)
with a copy of one ad card's HTML. That capture goes into
[`src/site/leboncoin/__fixtures__/`](src/site/leboncoin/__fixtures__/) as a
regression test, which is the shortest path from "it broke" to "it cannot break
that way again".

## Licence

MIT, see [LICENSE](LICENSE).

Independent project. Not affiliated with or endorsed by leboncoin.
