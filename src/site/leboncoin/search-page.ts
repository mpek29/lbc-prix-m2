import { parseFrenchNumber } from '@/core/parse/number';

/**
 * How many results a search has, and where the rest of them live.
 *
 * Sorting by price per square metre cannot be delegated to leboncoin: their
 * sort parameter offers relevance, date and price, and nothing that divides one
 * by the other. So the extension gathers the results itself, which is easier
 * when it knows how many there are.
 *
 * "Easier", not "possible". The first version of this file read the totals out
 * of `__NEXT_DATA__` and gave up when it could not, which quietly turned the
 * whole feature into a single-page sort on a real browser while working
 * perfectly against a fetched copy of the same URL. Now the totals are a
 * convenience: they make the progress bar exact and let the banner state
 * coverage. Without them the collection still runs, walking pages until one
 * comes back empty.
 */

/** leboncoin's page size. Only used when we cannot read the real one. */
const ASSUMED_PER_PAGE = 35;

/** leboncoin refuses to paginate past this. Only used as a fallback. */
const ASSUMED_MAX_PAGES = 100;

export interface Pagination {
  /** Results matching the search, or `null` when we could not read a count. */
  readonly total: number | null;
  readonly perPage: number;
  readonly maxPages: number;
}

const NEXT_DATA = 'script#__NEXT_DATA__';

/** `217 762 annonces` as rendered on the page, in any of France's spacings. */
const RESULT_COUNT = /(\d[\d\s]*)\s*(annonces?|résultats?)\b/gi;

const isPositiveInt = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value > 0;

/**
 * Totals from `__NEXT_DATA__`, the JSON Next.js leaves in the page.
 *
 * Their internal shape, so every field is checked and anything unexpected reads
 * as absent.
 */
function readFromNextData(doc: Document): Partial<Pagination> {
  const raw = doc.querySelector(NEXT_DATA)?.textContent;
  if (!raw) return {};

  try {
    const props = JSON.parse(raw)?.props?.pageProps;
    const total = props?.searchData?.total;
    const maxPages = props?.searchData?.max_pages;
    const perPage = props?.search?.limit;

    return {
      ...(isPositiveInt(total) ? { total } : {}),
      ...(isPositiveInt(maxPages) ? { maxPages } : {}),
      ...(isPositiveInt(perPage) ? { perPage } : {}),
    };
  } catch {
    return {};
  }
}

/**
 * The count leboncoin prints for the reader, such as "217 762 annonces".
 *
 * Preferred over the JSON for the same reason the ad reader prefers ARIA: this
 * is text leboncoin has to keep correct because people read it, whereas
 * `__NEXT_DATA__` is a private structure that owes us nothing.
 */
export function readResultCount(doc: Document): number | null {
  let largest: number | null = null;

  // The largest match rather than the first. A results page can carry several
  // of these ("35 annonces" in a per-page line, "62 annonces" for the search),
  // and taking the first one found reports a page size as a total, which reads
  // as "this search has one page" and stops the collection before it starts.
  for (const match of (doc.body?.textContent ?? '').matchAll(RESULT_COUNT)) {
    const value = match[1] === undefined ? null : parseFrenchNumber(match[1]);
    if (value !== null && value > 0 && (largest === null || value > largest)) largest = value;
  }

  return largest;
}

/**
 * Best effort, and never `null`.
 *
 * A missing total means the collection walks until a page comes back empty
 * rather than not running at all.
 */
export function readPagination(doc: Document): Pagination {
  const fromJson = readFromNextData(doc);

  return {
    total: fromJson.total ?? readResultCount(doc),
    perPage: fromJson.perPage ?? ASSUMED_PER_PAGE,
    maxPages: fromJson.maxPages ?? ASSUMED_MAX_PAGES,
  };
}

/** Pages the search has, or `null` when the total is unknown. */
export function pageCount(pagination: Pagination): number | null {
  return pagination.total === null ? null : Math.ceil(pagination.total / pagination.perPage);
}

export interface FetchPlan {
  /** Pages we are prepared to ask for. An upper bound, not a promise. */
  readonly pages: number;
  /** leboncoin's page size, reused so our own paging matches theirs. */
  readonly perPage: number;
  /** Ads that many pages can hold, or `null` when the total is unknown. */
  readonly reachable: number | null;
  readonly total: number | null;
  /** True only when the plan provably covers every result. */
  readonly complete: boolean;
}

export function planFetch(pagination: Pagination, budgetPages: number): FetchPlan {
  const ceiling = Math.min(pagination.maxPages, budgetPages);
  const known = pageCount(pagination);
  const pages = known === null ? ceiling : Math.min(known, ceiling);

  const { perPage } = pagination;

  if (pagination.total === null) {
    return { pages, perPage, reachable: null, total: null, complete: false };
  }

  const reachable = Math.min(pages * perPage, pagination.total);
  return {
    pages,
    perPage,
    reachable,
    total: pagination.total,
    complete: reachable >= pagination.total,
  };
}

/** The same search, on another page. Page 1 carries no parameter. */
export function pageUrl(current: string, page: number): string {
  const url = new URL(current);
  if (page <= 1) url.searchParams.delete('page');
  else url.searchParams.set('page', String(page));
  return url.toString();
}
