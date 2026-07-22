import './sort-summary.css';

/**
 * The line above the results saying what was sorted, and how far along it is.
 *
 * Two jobs, both about not misleading the reader.
 *
 * The first is scope. leboncoin caps pagination at 100 pages, so a search with
 * 217 762 results can never be fully sorted by anyone. Showing "Prix/m²
 * croissant" over a list covering 1.6% of the matches, with no note, is a claim
 * the reader has no way to check.
 *
 * The second is time. Collecting twenty pages takes several seconds, and for
 * all of that the list still holds leboncoin's original order. Without a
 * progress bar and without hiding the cards, the reader reads a finished-
 * looking list that is not the answer they asked for.
 */
export const SUMMARY_MARKER = 'data-lbc-prix-m2-summary';

/** Put on the results list while collecting, to hide the stale order. */
export const BUSY_MARKER = 'data-lbc-prix-m2-busy';

const CLASS = {
  root: 'lbc-prix-m2-summary',
  title: 'lbc-prix-m2-summary__title',
  detail: 'lbc-prix-m2-summary__detail',
  track: 'lbc-prix-m2-summary__track',
  bar: 'lbc-prix-m2-summary__bar',
  action: 'lbc-prix-m2-summary__action',
} as const;

export interface SummaryText {
  readonly title: string;
  readonly detail: string;
}

export interface Progress {
  readonly done: number;
  readonly total: number;
}

export function createSortSummary(doc: Document, text: SummaryText): HTMLElement {
  const root = doc.createElement('div');
  root.className = CLASS.root;
  root.setAttribute(SUMMARY_MARKER, '');
  // Polite rather than assertive: this updates several times a second while
  // collecting, and a screen reader interrupting itself that often is useless.
  root.setAttribute('role', 'status');
  root.setAttribute('aria-live', 'polite');

  const line = doc.createElement('div');
  line.className = 'lbc-prix-m2-summary__line';

  const title = doc.createElement('span');
  title.className = CLASS.title;
  title.textContent = text.title;

  const detail = doc.createElement('span');
  detail.className = CLASS.detail;
  detail.textContent = text.detail;

  line.append(title, detail);
  root.append(line);
  return root;
}

export function updateSortSummary(summary: Element, text: SummaryText): void {
  const title = summary.querySelector(`.${CLASS.title}`);
  const detail = summary.querySelector(`.${CLASS.detail}`);
  if (title) title.textContent = text.title;
  if (detail) detail.textContent = text.detail;
}

/**
 * Offers an action in the banner, or removes it when passed `null`.
 *
 * Used to restore a sort from the URL without acting on it. Opening a shared
 * link should not quietly start a hundred requests, so the reader is told what
 * the link asked for and given the button.
 */
export function setSortAction(
  summary: Element,
  action: { label: string; onClick: () => void } | null,
): void {
  summary.querySelector(`.${CLASS.action}`)?.remove();
  if (!action) return;

  const doc = summary.ownerDocument;
  const button = doc.createElement('button');
  button.type = 'button';
  button.className = CLASS.action;
  button.textContent = action.label;
  button.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    action.onClick();
  });

  summary.querySelector('.lbc-prix-m2-summary__line')?.append(button);
}

/**
 * Shows how far the collection has got, or removes the bar when passed `null`.
 *
 * Determinate on purpose. The page count is known before the first request, so
 * a spinner would be throwing away information the reader wants: whether this
 * is a two-second wait or a ten-second one.
 */
export function setSortProgress(summary: Element, progress: Progress | null): void {
  const existing = summary.querySelector(`.${CLASS.track}`);

  if (!progress) {
    existing?.remove();
    return;
  }

  const doc = summary.ownerDocument;
  const track = existing ?? doc.createElement('div');
  if (!existing) {
    track.className = CLASS.track;
    track.setAttribute('role', 'progressbar');

    const bar = doc.createElement('div');
    bar.className = CLASS.bar;
    track.append(bar);
    summary.append(track);
  }

  const ratio = progress.total > 0 ? Math.min(progress.done / progress.total, 1) : 0;
  track.setAttribute('aria-valuemin', '0');
  track.setAttribute('aria-valuemax', String(progress.total));
  track.setAttribute('aria-valuenow', String(progress.done));
  track.setAttribute('aria-label', `Page ${progress.done} sur ${progress.total}`);

  const bar = track.querySelector<HTMLElement>(`.${CLASS.bar}`);
  if (bar) bar.style.width = `${Math.round(ratio * 100)}%`;
}

/**
 * Hides the results while they are being collected.
 *
 * The list still holds leboncoin's order until the last page lands, and a
 * reader given several seconds with a finished-looking list will read it.
 */
export function setResultsBusy(list: Element, busy: boolean): void {
  if (busy) {
    list.setAttribute(BUSY_MARKER, '');
    list.setAttribute('aria-busy', 'true');
  } else {
    list.removeAttribute(BUSY_MARKER);
    list.removeAttribute('aria-busy');
  }
}

export function findSortSummary(root: ParentNode): Element | null {
  return root.querySelector(`[${SUMMARY_MARKER}]`);
}

export function isSortSummary(node: Node): boolean {
  return node instanceof Element && node.hasAttribute(SUMMARY_MARKER);
}
