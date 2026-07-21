# Changelog

All notable changes to this project are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] — 2026-07-21

Initial release.

### Added

- Price per square metre shown next to the price on every priceable ad card in a
  leboncoin search, for both rentals and sales.
- Popup toggle to switch the badges off, applied live in every open tab.
- Chrome and Firefox builds from a single codebase, both Manifest V3.
- Badges announced to screen readers as a spelled-out sentence, mirroring
  leboncoin's own dual-rendering pattern.
- Console warning when every card on a page fails to yield a price, so a
  markup change on leboncoin's side is reported rather than silent.

[unreleased]: https://github.com/florianp/lbc-prix-m2/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/florianp/lbc-prix-m2/releases/tag/v0.1.0
