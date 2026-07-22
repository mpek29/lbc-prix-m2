import { formatAmount } from '@/core/format';
import { sortByPricePerArea, type SortDirection } from '@/core/sort';
import {
  findNativeRadios,
  findRowTemplate,
  findSortChipLabel,
  findSortRadioGroup,
} from '@/site/leboncoin/sort-control';
import { findResultsList } from '@/site/leboncoin/results-list';
import { findPagination } from '@/site/leboncoin/pagination';
import { pageUrl, planFetch, readPagination, type FetchPlan } from '@/site/leboncoin/search-page';
import { fetchPagesSequentially } from '@/platform/http';
import type { Logger } from '@/platform/logger';
import { createPager, findPager, updatePager } from '@/ui/pager';
import { createSortOption, findSortOptions, setOptionChecked, SORT_VALUE } from '@/ui/sort-option';
import {
  createSortSummary,
  findSortSummary,
  setResultsBusy,
  setSortProgress,
  updateSortSummary,
} from '@/ui/sort-summary';
import { collectFrom, mergeUnique, type CollectedAd } from './collect-listings';

/**
 * Sorting a leboncoin search by price per square metre.
 *
 * leboncoin sorts server side, and their sort parameter offers relevance, date
 * and price. Nothing divides one by the other, so the only way to order a whole
 * result set by €/m² is to hold the whole result set, which means fetching the
 * pages ourselves.
 *
 * The collection walks pages until they stop producing new ads, so it does not
 * depend on knowing the result count. It used to, reading the total out of
 * `__NEXT_DATA__` and quietly falling back to sorting one page when it could
 * not, which is what shipped and what a reader saw as a broken feature.
 *
 * One ceiling is not ours: leboncoin refuses to paginate past 100 pages, so a
 * search with 217 762 matches can never be fully ordered by anybody. Where the
 * sort is complete it says so, and where it is not it says that too.
 */

/**
 * Requests we are willing to make for one sort.
 *
 * 100 is leboncoin's own ceiling, so this is "everything they will serve".
 * At roughly a second and a half per page that is a long wait on a broad
 * search, which is why the progress bar is determinate and the whole run can be
 * abandoned by picking another sort.
 */
const BUDGET_PAGES = 100;

/** Pause between requests. Sequential and unhurried, so we look like a reader. */
const DELAY_MS = 350;

const LABELS: Record<SortDirection, string> = {
  asc: 'Prix/m² croissant',
  desc: 'Prix/m² décroissant',
};

export interface AreaSorter {
  /** Adds our options to the sort menu whenever leboncoin opens it. */
  syncMenu(): void;
  /** Undoes everything and puts the page back as it was served. */
  reset(): void;
  /** The direction currently applied, if any. */
  active(): SortDirection | null;
}

export interface AreaSorterOptions {
  /** Requests we are willing to make for one sort. */
  readonly budgetPages?: number;
  /** Pause between requests. */
  readonly delayMs?: number;
}

export function createAreaSorter(
  doc: Document,
  logger: Logger,
  options: AreaSorterOptions = {},
): AreaSorter {
  const budgetPages = options.budgetPages ?? BUDGET_PAGES;
  const delayMs = options.delayMs ?? DELAY_MS;
  /** Marks leboncoin's pager while ours stands in for it. */
  const NATIVE_PAGER_HIDDEN = 'data-lbc-prix-m2-pager-hidden';

  let direction: SortDirection | null = null;
  let originalOrder: Element[] | null = null;
  let run: AbortController | null = null;
  /** The sorted result set, held so paging never refetches anything. */
  let sorted: CollectedAd[] = [];
  let pageSize = 35;

  // ── The menu ──────────────────────────────────────────────────────────────

  function syncMenu(): void {
    const group = findSortRadioGroup(doc);
    if (!group) return; // Menu closed, which is the normal state.
    if (findSortOptions(group).length > 0) return; // Already ours.

    const template = findRowTemplate(group);
    if (!template) return;

    for (const dir of ['asc', 'desc'] as const) {
      const row = createSortOption(template, {
        value: SORT_VALUE[dir],
        label: LABELS[dir],
        checked: direction === dir,
      });
      row.addEventListener('click', (event) => {
        // Radix owns this menu. Letting the event through would have it try to
        // select a radio it never rendered.
        event.preventDefault();
        event.stopPropagation();
        void choose(dir);
      });
      group.append(row);
    }

    // Leboncoin's own radio stays visually selected otherwise, so the menu
    // would show two chosen options.
    if (direction) clearNativeSelection(group);
    logger.debug('sort options added to the menu');
  }

  function clearNativeSelection(group: Element): void {
    for (const radio of findNativeRadios(group)) {
      const row = radio.parentElement;
      if (row) setOptionChecked(row, false);
    }
  }

  // ── Choosing ──────────────────────────────────────────────────────────────

  async function choose(next: SortDirection): Promise<void> {
    direction = next;

    const group = findSortRadioGroup(doc);
    if (group) {
      clearNativeSelection(group);
      for (const row of findSortOptions(group)) {
        setOptionChecked(row, row.getAttribute('data-lbc-prix-m2-sort') === SORT_VALUE[next]);
      }
    }
    setChipLabel(`Tri : ${LABELS[next]}`);

    run?.abort();
    run = new AbortController();
    await apply(next, run.signal);
  }

  function setChipLabel(text: string): void {
    const label = findSortChipLabel(doc);
    if (label) label.textContent = text;
  }

  // ── Applying ──────────────────────────────────────────────────────────────

  async function apply(next: SortDirection, signal: AbortSignal): Promise<void> {
    const list = findResultsList(doc);
    if (!list) return;

    originalOrder ??= Array.from(list.children);

    const plan = planFetch(readPagination(doc), budgetPages);
    const willFetch = plan.pages > 1;

    const summary = showSummary(list, {
      title: LABELS[next],
      detail: willFetch ? `collecte des annonces, page 1 sur ${plan.pages}…` : 'tri des annonces…',
    });

    // Nothing below may leave the list hidden. A reader looking at a blank page
    // because a request failed has lost the results altogether, which is far
    // worse than an unsorted list.
    try {
      if (willFetch && summary) {
        setResultsBusy(list, true);
        setSortProgress(summary, { done: 1, total: plan.pages });
      }

      const { pages, stoppedEarly } = await collect(plan, signal, (done) => {
        if (!summary) return;
        setSortProgress(summary, { done, total: plan.pages });
        updateSortSummary(summary, {
          title: LABELS[next],
          detail: `collecte des annonces, page ${done} sur ${plan.pages}…`,
        });
      });

      if (signal.aborted) return;

      const ads = sortByPricePerArea(mergeUnique(pages), next);
      sorted = ads;
      pageSize = plan.perPage;
      hideNativePagination();
      showPage(list, 1);
      if (summary) {
        updateSortSummary(summary, {
          title: LABELS[next],
          detail: describe(ads, plan, { pagesRead: pages.length, stoppedEarly }),
        });
      }
      logger.debug('sorted', { direction: next, ads: ads.length, pages: pages.length });

      if (stoppedEarly && plan.total !== null && ads.length < plan.total) {
        // Visible in released builds, unlike debug. Either leboncoin stopped
        // paginating, or the count we read off the page is not the total.
        logger.warn(
          `collected ${ads.length} ads but the page advertises ${plan.total}. ` +
            `Stopped after ${pages.length} page(s): the next one returned nothing new.`,
        );
      }
    } catch (error) {
      logger.error('could not collect the pages of this search', error);
      if (summary) {
        updateSortSummary(summary, {
          title: LABELS[next],
          detail: 'la collecte a échoué, les annonces sont affichées sans tri.',
        });
      }
    } finally {
      setResultsBusy(list, false);
      if (summary) setSortProgress(summary, null);
    }
  }

  /**
   * Walks the search's pages until they stop producing anything new.
   *
   * The stop condition is "this page contributed no ad we did not already
   * have", which covers every way a walk can end with one rule:
   *
   * - the results ran out, and the page comes back empty;
   * - leboncoin clamped a too-high page number back to one we have already
   *   read, so the request succeeds and returns familiar ads;
   * - DataDome served a challenge, which arrives as a valid 200 with no ads.
   *
   * Counting only new ads matters because the plan is an upper bound. When the
   * total is unknown it is the full ceiling, and a one-page search would
   * otherwise spend a hundred requests rediscovering the same 35 ads.
   */
  async function collect(
    plan: FetchPlan,
    signal: AbortSignal,
    onProgress: (done: number) => void,
  ): Promise<{ pages: CollectedAd[][]; stoppedEarly: boolean }> {
    // Page 1 is already on screen. Re-fetching it would be a wasted request and
    // would swap live cards for inert copies.
    const first = collectFrom(doc, doc);
    const pages: CollectedAd[][] = [first];
    const seen = new Set(first.map((ad) => ad.id).filter((id): id is string => id !== null));

    const urls = Array.from({ length: plan.pages - 1 }, (_, i) =>
      pageUrl(doc.location.href, i + 2),
    );

    let stoppedEarly = false;
    let read = 1;

    for await (const fetched of fetchPagesSequentially(urls, { delayMs, signal })) {
      const ads = collectFrom(fetched, doc);
      const fresh = ads.filter((ad) => ad.id === null || !seen.has(ad.id));

      if (fresh.length === 0) {
        stoppedEarly = true;
        logger.debug('stopped: a page produced nothing new', { page: read + 1 });
        break;
      }

      for (const ad of fresh) if (ad.id !== null) seen.add(ad.id);
      pages.push(fresh);
      onProgress((read += 1));
    }

    return { pages, stoppedEarly };
  }

  /**
   * Shows one page of the sorted results.
   *
   * Everything has already been collected, so paging is a slice of an array in
   * memory. Nothing is fetched, nothing navigates, and the sort survives.
   */
  function showPage(list: Element, page: number): void {
    const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
    const clamped = Math.min(Math.max(page, 1), pages);
    const start = (clamped - 1) * pageSize;

    const fragment = doc.createDocumentFragment();
    for (const ad of sorted.slice(start, start + pageSize)) fragment.append(ad.item);
    list.replaceChildren(fragment);

    showPager(list, { page: clamped, pages });
  }

  function showPager(list: Element, state: { page: number; pages: number }): void {
    const existing = findPager(doc);
    if (existing) {
      updatePager(existing, state);
      return;
    }

    const pager = createPager(doc, {
      ...state,
      onSelect: (page) => {
        const current = findResultsList(doc);
        if (!current) return;
        showPage(current, page);
        // Paging without this leaves the reader at the scroll position of the
        // page they just left, looking at the middle of a different list.
        current.scrollIntoView({ block: 'start' });
      },
    });
    list.after(pager);
  }

  /**
   * Puts leboncoin's pager away while ours is in charge.
   *
   * Theirs describes a paging that no longer matches the list, and following it
   * navigates off the page and discards the sort.
   */
  function hideNativePagination(): void {
    const native = findPagination(doc);
    if (native) native.setAttribute(NATIVE_PAGER_HIDDEN, '');
  }

  function restoreNativePagination(): void {
    for (const element of doc.querySelectorAll(`[${NATIVE_PAGER_HIDDEN}]`)) {
      element.removeAttribute(NATIVE_PAGER_HIDDEN);
    }
  }

  function describe(
    ads: readonly CollectedAd[],
    plan: FetchPlan,
    run: { pagesRead: number; stoppedEarly: boolean },
  ): string {
    const priced = ads.filter((ad) => ad.pricePerArea !== null);
    const cheapest = priced[0]?.pricePerArea;
    const range =
      priced.length > 1 && cheapest !== undefined && cheapest !== null
        ? ` De ${formatAmount(Math.min(...priced.map((a) => a.pricePerArea!)))} à ${formatAmount(
            Math.max(...priced.map((a) => a.pricePerArea!)),
          )} €/m².`
        : '';

    const pages = `${run.pagesRead} page${run.pagesRead > 1 ? 's' : ''}`;
    const count = (value: number) => value.toLocaleString('fr-FR');

    // Everything we expected, so say so plainly.
    if (plan.total !== null && ads.length >= plan.total) {
      return `Les ${count(ads.length)} annonces de cette recherche, sur ${pages}.${range}`;
    }

    // Stopped before the total said we should have. `stoppedEarly` means a page
    // gave us nothing new, which is what running out of results looks like, and
    // equally what leboncoin returning page 1 for page 2 looks like, and what a
    // challenge page looks like. Calling that "complete" is the quiet lie this
    // banner exists to prevent, so it reports both numbers and lets the reader
    // judge.
    if (run.stoppedEarly && plan.total !== null) {
      return (
        `${count(ads.length)} annonces sur ${count(plan.total)} annoncées, ` +
        `collecte arrêtée après ${pages}. leboncoin n’a pas renvoyé la suite.${range}`
      );
    }

    if (run.stoppedEarly) {
      return `Les ${count(ads.length)} annonces trouvées, sur ${pages}.${range}`;
    }

    if (plan.total === null) {
      return `${count(ads.length)} annonces collectées sur ${pages}.${range}`;
    }

    return (
      `Les ${count(ads.length)} premières sur ${count(plan.total)} résultats. ` +
      `leboncoin ne permet pas d’aller au-delà.${range}`
    );
  }

  function showSummary(list: Element, text: { title: string; detail: string }): Element | null {
    const existing = findSortSummary(doc);
    if (existing) {
      updateSortSummary(existing, text);
      return existing;
    }

    const summary = createSortSummary(doc, text);
    list.parentElement?.insertBefore(summary, list);
    return summary;
  }

  // ── Undoing ───────────────────────────────────────────────────────────────

  function reset(): void {
    run?.abort();
    run = null;
    direction = null;

    const list = findResultsList(doc);
    if (list) {
      setResultsBusy(list, false);
      if (originalOrder) list.replaceChildren(...originalOrder);
    }
    originalOrder = null;
    sorted = [];

    findPager(doc)?.remove();
    restoreNativePagination();

    findSortSummary(doc)?.remove();
    for (const row of findSortOptions(doc)) setOptionChecked(row, false);
  }

  return { syncMenu, reset, active: () => direction };
}
