# 7. Collect pages ourselves to sort by price per square metre

- **Status:** accepted
- **Date:** 2026-07-22

## Context

Adding "Prix/m² croissant" to leboncoin's sort menu looks like a small feature
until you ask what the sort is meant to order.

leboncoin sorts server side. The menu writes a `sort` parameter and the server
returns an already-ordered page of 35 results. The values it accepts are
`relevance`, `time,asc`, `time,desc`, `price,asc` and `price,desc`. Nothing
divides a price by a surface, and nothing can be added to make it, because the
computation belongs to a server we do not run.

So the browser has to do the ordering, which means the browser has to hold the
things being ordered. Measurements taken while writing this:

| Search                     | Results | Pages | Reachable | Coverage |
| -------------------------- | ------- | ----- | --------- | -------- |
| `category=10`, no filter   | 217 762 | 6 222 | 3 500     | 1.6 %    |
| `category=10` + Concarneau | 74      | 3     | 74        | 100 %    |

The second row is the honest case for how people search: a town, a budget, a
number of rooms. The first row is the one that shapes the design, because
`max_pages` is 100 in leboncoin's own payload. **A complete €/m² ordering of an
unfiltered search is impossible for anyone**, extension or otherwise. No budget,
patience or cleverness gets past a ceiling the server enforces.

## Decision

Fetch the search's own pages, sequentially, and sort what comes back.

- **Pin the sort while collecting.** The default ordering is `relevance`, which
  leboncoin re-ranks with a pivot, so an ad on page 1 can be on page 2 a second
  later. Walking those pages returns some ads twice and misses others: a 62
  result search collected 50 that way. Every request carries an explicit sort,
  so page N means the same thing for the length of the walk. The order does not
  matter, since the result is about to be sorted by €/m² anyway.

  The sort exists in two shapes and they are not interchangeable. The radio
  buttons carry `price,asc` as a single value; the URL takes `sort=price` and
  `order=asc` as two parameters. Pinning the radio's form in a URL is accepted
  and ignored, which leaves the walk on relevance and any `order` the reader had
  already chosen still in place. Nothing about the response says so: a rejected
  sort still returns a perfectly good page of results.

- **Walk, do not calculate.** Keep requesting pages until one produces no ad we
  did not already have. That single rule ends the walk whether the results ran
  out, leboncoin clamped the page number, or DataDome served a challenge.
- **Totals are a convenience, not a requirement.** `__NEXT_DATA__` carries
  `total` and `max_pages`, and the page prints the count for the reader. Either
  makes the progress bar exact and lets the banner state coverage. Neither is
  needed to run.
- **One ceiling, and it is not ours.** leboncoin's `max_pages` is 100. The
  extension's own budget matches it, so it fetches everything they will serve.
- **Say which case you are in.** When the plan covers every result, the banner
  says so. When it cannot, it gives the real numbers rather than implying a
  complete ordering.
- **Be a considerate guest.** One request at a time, 350 ms apart, abortable,
  and stopping at the first refusal. Page 1 is fetched like the rest, because it
  has to be read under the same pinned sort; the cards already on screen are
  matched back by id and reused, so they keep working.
- **Reuse the existing adapter.** leboncoin server-renders its results, so a
  fetched page arrives with all 35 cards and the same `data-qa-id` and ARIA
  hooks the live page has. The reader written for the live DOM parses fetched
  pages unchanged.

## Consequences

The good case is very good. A filtered search is three requests and about a
second, and the resulting order is complete and correct.

Three costs, all real.

**Ads from other pages are inert.** They are imported nodes that leboncoin's
React never mounted, so their photo carousel and favourite button do nothing.
They carry a marker and a small label saying where they came from, which is
better than letting a dead button be discovered.

**The page keeps its shape, but the paging is ours.** The collection holds every
result at once, which is not how anyone wants to read several hundred ads, so
the sorted set is shown a page at a time using leboncoin's own page size.
Turning a page is a slice of an array already in memory: nothing is fetched and
nothing navigates, so the sort survives. leboncoin's own pager is hidden while
this is active, because it describes a paging that no longer matches the list
and following it would discard the sort. Choosing one of their sort options
restores it.

**It is traffic they did not ask for.** Sequential and paced is the difference
between reading a search quickly and hammering a site. A challenge page or a
run of familiar ads both stop the walk, so a site that says no is not asked
twice. If leboncoin ever signals that the whole thing is unwelcome, the budget
is one constant and the feature is one directory.

**A challenge page is an HTTP 200 with no ads in it.** Confirmed while writing
this: two requests came back "successfully" with 774 bytes of DataDome. Nothing
in the status line distinguishes a block from an empty result, which is why the
walk's stop condition is "no new ads" rather than an error check, and why an
empty collection falls back to the ads already on screen instead of rendering
nothing.

**Two shortfalls were reported as leboncoin's fault before they were ours.**
First a missing total silently became a single-page sort. Then an incomplete
walk was labelled "leboncoin ne permet pas d'aller au-delà" when nothing near
their ceiling had been reached. Both read as the site being limited rather than
the extension being wrong, which is the worst way for a bug to present: it
sends the reader to complain to the wrong people.

**Depending on `__NEXT_DATA__` was a mistake worth recording.** The first
version read the totals out of it and gave up when it could not, which passed
every test and worked against a fetched copy of the same URL, while degrading to
a single-page sort in a real browser. Tests that fetch their own fixtures cannot
catch a difference between a fetched page and a rendered one.

The alternative considered and rejected was sorting only the ads already on
screen. It costs nothing and is defensible, but sorting 35 of 74 results when
the other 39 are one request away is a worse answer than fetching them.
