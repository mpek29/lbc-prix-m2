import { formatAmount } from '@/core/format';
import { sortByPricePerArea, type SortDirection } from '@/core/sort';
import {
  findNativeRadios,
  findRowTemplate,
  findSortChipLabel,
  findSortRadioGroup,
} from '@/site/leboncoin/sort-control';
import { findResultsList } from '@/site/leboncoin/results-list';
import { pageUrl, planFetch, readPagination, type FetchPlan } from '@/site/leboncoin/search-page';
import { fetchPages } from '@/platform/http';
import type { Logger } from '@/platform/logger';
import { createSortOption, findSortOptions, setOptionChecked, SORT_VALUE } from '@/ui/sort-option';
import { createSortSummary, findSortSummary, updateSortSummary } from '@/ui/sort-summary';
import { collectFrom, mergeUnique, type CollectedAd } from './collect-listings';

/**
 * Sorting a leboncoin search by price per square metre.
 *
 * leboncoin sorts server side, and their sort parameter offers relevance, date
 * and price. Nothing divides one by the other, so the only way to order a whole
 * result set by €/m² is to hold the whole result set, which means fetching the
 * pages ourselves.
 *
 * Two ceilings shape everything here. leboncoin refuses to paginate past 100
 * pages, so 217 762 rentals can never be fully sorted by anybody. And we refuse
 * to make more requests than `BUDGET_PAGES`, because a search worth thousands
 * of requests is a search that wants a filter, not an extension.
 *
 * Where the sort is complete, it says so. Where it is not, it says that too.
 */

/** Requests we are willing to make for one sort. 20 pages is 700 ads. */
const BUDGET_PAGES = 20;

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
  let direction: SortDirection | null = null;
  let originalOrder: Element[] | null = null;
  let run: AbortController | null = null;

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

    const pagination = readPagination(doc);
    const plan = pagination ? planFetch(pagination, budgetPages) : null;

    showSummary(list, {
      title: LABELS[next],
      detail: plan ? `collecte de ${plan.pages} page(s)…` : 'tri des annonces affichées…',
    });

    const pages = plan ? await collect(plan, signal) : [collectFrom(doc, doc)];
    if (signal.aborted) return;

    const ads = sortByPricePerArea(mergeUnique(pages), next);
    render(list, ads);
    showSummary(list, { title: LABELS[next], detail: describe(ads, plan) });
    logger.debug('sorted', { direction: next, ads: ads.length, pages: pages.length });
  }

  async function collect(plan: FetchPlan, signal: AbortSignal): Promise<CollectedAd[][]> {
    // Page 1 is already on screen. Re-fetching it would be a wasted request and
    // would swap live cards for inert copies.
    const here = collectFrom(doc, doc);
    const urls = Array.from({ length: plan.pages - 1 }, (_, i) =>
      pageUrl(doc.location.href, i + 2),
    );

    const fetched = await fetchPages(urls, { delayMs, signal });
    return [here, ...fetched.map((page) => collectFrom(page, doc))];
  }

  function render(list: Element, ads: readonly CollectedAd[]): void {
    const fragment = doc.createDocumentFragment();
    for (const ad of ads) fragment.append(ad.item);
    list.replaceChildren(fragment);
  }

  function describe(ads: readonly CollectedAd[], plan: FetchPlan | null): string {
    const priced = ads.filter((ad) => ad.pricePerArea !== null);
    const cheapest = priced[0]?.pricePerArea;
    const range =
      priced.length > 1 && cheapest !== undefined && cheapest !== null
        ? ` De ${formatAmount(Math.min(...priced.map((a) => a.pricePerArea!)))} à ${formatAmount(
            Math.max(...priced.map((a) => a.pricePerArea!)),
          )} €/m².`
        : '';

    if (!plan) return `${ads.length} annonces affichées triées.${range}`;
    if (plan.complete) return `Les ${ads.length} annonces de cette recherche.${range}`;

    return (
      `Les ${ads.length} premières sur ${plan.total.toLocaleString('fr-FR')} résultats. ` +
      `leboncoin ne permet pas d’aller au-delà.${range}`
    );
  }

  function showSummary(list: Element, text: { title: string; detail: string }): void {
    const existing = findSortSummary(doc);
    if (existing) {
      updateSortSummary(existing, text);
      return;
    }
    list.parentElement?.insertBefore(createSortSummary(doc, text), list);
  }

  // ── Undoing ───────────────────────────────────────────────────────────────

  function reset(): void {
    run?.abort();
    run = null;
    direction = null;

    const list = findResultsList(doc);
    if (list && originalOrder) list.replaceChildren(...originalOrder);
    originalOrder = null;

    findSortSummary(doc)?.remove();
    for (const row of findSortOptions(doc)) setOptionChecked(row, false);
  }

  return { syncMenu, reset, active: () => direction };
}
