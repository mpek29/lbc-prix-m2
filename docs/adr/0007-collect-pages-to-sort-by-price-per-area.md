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

- **Read the totals first.** `__NEXT_DATA__` carries `total`, `max_pages` and
  the page size, so the extension knows the shape of the job before making a
  single request.
- **Two ceilings.** leboncoin's `max_pages`, and our own budget of 20 pages
  (700 ads). A search worth thousands of requests is a search that wants a
  filter, not an extension.
- **Say which case you are in.** When the plan covers every result, the banner
  says so. When it cannot, it gives the real numbers rather than implying a
  complete ordering.
- **Be a considerate guest.** One request at a time, 350 ms apart, abortable,
  and stopping at the first refusal. Page 1 is never re-fetched, since it is
  already on screen.
- **Reuse the existing adapter.** leboncoin server-renders its results, so a
  fetched page arrives with all 35 cards and the same `data-qa-id` and ARIA
  hooks the live page has. The reader written for the live DOM parses fetched
  pages unchanged.

## Consequences

The good case is genuinely good. A filtered search is three requests and about a
second, and the resulting order is complete and correct.

Three costs, all real.

**Ads from other pages are inert.** They are imported nodes that leboncoin's
React never mounted, so their photo carousel and favourite button do nothing.
They carry a marker and a small label saying where they came from, which is
better than letting a dead button be discovered.

**The page stops matching its own pagination.** The list now holds up to 700
ads, and leboncoin's page links still refer to their own paging. Choosing one of
their sort options resets everything, which is the escape hatch.

**It is traffic they did not ask for.** Sequential and paced is the difference
between reading a search quickly and hammering a site. If leboncoin ever
signals that it is unwelcome, the budget is one constant and the feature is one
directory.

The alternative considered and rejected was sorting only the ads already on
screen. It costs nothing and is defensible, but sorting 35 of 74 results when
the other 39 are one request away is a worse answer than fetching them.
