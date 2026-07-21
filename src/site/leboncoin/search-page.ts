/**
 * How many results a search has, and where the rest of them live.
 *
 * Sorting by price per square metre cannot be delegated to leboncoin: their
 * sort parameter offers relevance, date and price, and nothing that divides one
 * by the other. So the extension has to gather the results itself, which means
 * knowing up front how many there are and how many pages that is.
 */

/**
 * Read from `__NEXT_DATA__`, the JSON blob Next.js leaves in the page.
 *
 * This is leboncoin's internal shape rather than a public contract, so every
 * field is checked and any surprise degrades to `null`. Losing the totals costs
 * us the multi-page sort, not the extension.
 */
export interface Pagination {
  /** Results matching the search, which can be in the hundreds of thousands. */
  readonly total: number;
  /** Results per page. 35 at the time of writing. */
  readonly perPage: number;
  /** leboncoin refuses to paginate past this. 100 at the time of writing. */
  readonly maxPages: number;
}

const NEXT_DATA = 'script#__NEXT_DATA__';

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

export function readPagination(doc: Document): Pagination | null {
  const raw = doc.querySelector(NEXT_DATA)?.textContent;
  if (!raw) return null;

  try {
    const props = JSON.parse(raw)?.props?.pageProps;
    const total = props?.searchData?.total;
    const maxPages = props?.searchData?.max_pages;
    const perPage = props?.search?.limit;

    if (!isPositiveInt(total) || !isPositiveInt(maxPages) || !isPositiveInt(perPage)) return null;

    return { total, perPage, maxPages };
  } catch {
    return null;
  }
}

/** Pages the search actually has, ignoring leboncoin's ceiling. */
export function pageCount(pagination: Pagination): number {
  return Math.ceil(pagination.total / pagination.perPage);
}

/**
 * Pages we are willing to fetch, and what that leaves out.
 *
 * Two ceilings apply. leboncoin refuses to serve past `maxPages`, and we refuse
 * to make more requests than `budgetPages` because a search with six thousand
 * pages is not worth six thousand requests to anybody.
 */
export interface FetchPlan {
  readonly pages: number;
  readonly reachable: number;
  readonly total: number;
  /** True when the plan covers every result, so the sort is the real thing. */
  readonly complete: boolean;
}

export function planFetch(pagination: Pagination, budgetPages: number): FetchPlan {
  const pages = Math.min(pageCount(pagination), pagination.maxPages, budgetPages);
  const reachable = Math.min(pages * pagination.perPage, pagination.total);

  return { pages, reachable, total: pagination.total, complete: reachable >= pagination.total };
}

/** The same search, on another page. Page 1 carries no parameter. */
export function pageUrl(current: string, page: number): string {
  const url = new URL(current);
  if (page <= 1) url.searchParams.delete('page');
  else url.searchParams.set('page', String(page));
  return url.toString();
}
