# Prix au m² pour leboncoin

Browser extension that shows the price per square metre on every property ad in
a leboncoin search, right next to the price leboncoin already prints.

```
640 €  [11,6 €/m²]      Appartement · 3 pièces · 55m² · Étage 1
```

It also adds two options to leboncoin's own sort menu, next to theirs:

```
Tri : Pertinence
  ( ) Pertinence          ( ) Prix croissants
  ( ) Plus récentes       ( ) Prix décroissants
  ( ) Plus anciennes      (o) Prix/m² croissant     ← added
                          ( ) Prix/m² décroissant   ← added
```

It runs in Chrome and Firefox from one codebase and asks for a single permission
(`storage`, to remember one boolean).

## Install

The extension is distributed as a zip, not through the Firefox or Chrome stores.
Download the one for your browser from the
[latest release](https://github.com/mpek29/lbc-prix-m2/releases/latest):

| File                                | For     |
| ----------------------------------- | ------- |
| `lbc-prix-m2-<version>-firefox.zip` | Firefox |
| `lbc-prix-m2-<version>-chrome.zip`  | Chrome  |

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select the downloaded `.zip` (no need to extract it)

Worth knowing before you start: Firefox removes temporary add-ons when it
closes, so this has to be redone each time you restart the browser. That is not
a bug in the packaging. Release-channel Firefox only keeps add-ons that Mozilla
has signed, and the `xpinstall.signatures.required` setting you will find in
older forum posts is ignored there. It works only on Developer Edition, Nightly
and ESR.

If reloading it every session gets old, `npm run sign:firefox` gets the build
signed by Mozilla for private use, which installs permanently on normal Firefox
without any public listing. It needs a Firefox Account and takes about a minute.
Steps are in [CONTRIBUTING.md](CONTRIBUTING.md#a-permanent-firefox-install).

### Chrome

1. Extract the `.zip` somewhere you can leave it, since Chrome loads the folder
   from disk every launch and will drop the extension if it moves
2. Open `chrome://extensions` and turn on **Developer mode** (top right)
3. Click **Load unpacked** and select the extracted folder

This survives restarts. Chrome shows a "Disable developer mode extensions"
warning on each launch, which you can dismiss.

### Building it yourself

```bash
npm ci
npm run build          # → .output/chrome-mv3
npm run build:firefox  # → .output/firefox-mv3
```

Then load those directories with the same steps as above, picking
`.output/firefox-mv3/manifest.json` for Firefox.

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

### Sorting by €/m²

leboncoin sorts on its server, and its sort parameter offers relevance, date and
price. Nothing divides one by the other, so the browser has to do the ordering,
which means holding the results to be ordered. Picking one of the €/m² options
makes the extension walk the search's own pages, one request at a time, and sort
what comes back.

It walks pages until they stop producing new ads, so it does not need to know
the result count in advance. One ceiling is not ours to move: leboncoin refuses
to paginate past 100 pages, so a search with 217 762 matches cannot be fully
ordered by anyone. The banner above the results says whether you got everything
or hit that wall.

A filtered search, which is how people actually use the site, is usually three
requests and a complete answer. A broad one takes a couple of minutes and is
worth narrowing instead.

The sorted results are shown a page at a time, using leboncoin's own page size,
with the extension's own next and previous controls. Turning a page costs
nothing: everything was collected up front, so it is a slice of a list already
in memory. leboncoin's pager is hidden meanwhile, since it describes a paging
the sorted list no longer follows. Ads pulled from pages you have not visited are
marked, and their photo carousel and favourite button do not work, because
leboncoin's own code never ran on them.

For the full picture and the reasoning behind each choice, see
[docs/architecture.md](docs/architecture.md) and [docs/adr/](docs/adr/), in
particular [ADR 0007](docs/adr/0007-collect-pages-to-sort-by-price-per-area.md).

## Privacy

Nothing about you leaves your browser. No analytics, no error reporting, no
remote config, and no server of ours to talk to. The Firefox manifest declares
`data_collection_permissions: none`.

The one exception is deliberate and visible: choosing a €/m² sort fetches
further pages of the search you are already looking at, from leboncoin, using
your existing session. Those are the same pages you would get by clicking
through the results yourself.

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
