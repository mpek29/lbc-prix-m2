# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Two options in leboncoin's own sort menu: "Prix/m² croissant" and "Prix/m²
  décroissant". Because leboncoin sorts on its server and offers no €/m²
  ordering, the extension collects the search's pages itself, one request at a
  time, and sorts what it gets.
- A banner above the results saying what was actually sorted, including when
  the result set is larger than leboncoin will paginate. See
  [ADR 0007](docs/adr/0007-collect-pages-to-sort-by-price-per-area.md).
- Client-side pagination of the sorted results, using leboncoin's own page
  size. Turning a page is a slice of the collected set, so nothing is fetched
  and the sort survives. leboncoin's own pager is hidden while this is active
  and restored on reset.
- A progress bar while the pages are being collected, with the ad cards hidden
  until the sorted order is ready. Collecting takes seconds, and until it
  finishes the list still holds leboncoin's order, which reads as a finished
  result. The cards come back whatever happens, including when a request fails
  or the sort is abandoned partway.

## [0.1.0] - 2026-07-21

Initial release.

### Added

- Price per square metre shown next to the price on every priceable ad card in a
  leboncoin search, for both rentals and sales.
- Popup toggle to switch the badges off, applied live in every open tab.
- Chrome and Firefox builds from a single codebase, both Manifest V3.
- Badges announced to screen readers as a spelled-out sentence, mirroring
  leboncoin's own dual-rendering pattern.
- Console warning when every card on a page fails to yield a price, so a markup
  change on leboncoin's side gets reported instead of going unnoticed.

[unreleased]: https://github.com/mpek29/lbc-prix-m2/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mpek29/lbc-prix-m2/releases/tag/v0.1.0
