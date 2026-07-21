import './sort-summary.css';

/**
 * A line above the results saying what was actually sorted.
 *
 * This exists because the sort can be honest or it can be quiet, and it cannot
 * be both. leboncoin caps pagination at 100 pages, so a search with 217 762
 * results can never be fully sorted by anyone. Showing "Prix/m² croissant" over
 * a list covering 1.6% of the matches, with no note, is a lie the reader has no
 * way to catch.
 */
export const SUMMARY_MARKER = 'data-lbc-prix-m2-summary';

const CLASS = {
  root: 'lbc-prix-m2-summary',
  title: 'lbc-prix-m2-summary__title',
  detail: 'lbc-prix-m2-summary__detail',
} as const;

export interface SummaryText {
  readonly title: string;
  readonly detail: string;
}

export function createSortSummary(doc: Document, text: SummaryText): HTMLElement {
  const root = doc.createElement('div');
  root.className = CLASS.root;
  root.setAttribute(SUMMARY_MARKER, '');
  root.setAttribute('role', 'status');

  const title = doc.createElement('span');
  title.className = CLASS.title;
  title.textContent = text.title;

  const detail = doc.createElement('span');
  detail.className = CLASS.detail;
  detail.textContent = text.detail;

  root.append(title, detail);
  return root;
}

export function updateSortSummary(summary: Element, text: SummaryText): void {
  const title = summary.querySelector(`.${CLASS.title}`);
  const detail = summary.querySelector(`.${CLASS.detail}`);
  if (title) title.textContent = text.title;
  if (detail) detail.textContent = text.detail;
}

export function findSortSummary(root: ParentNode): Element | null {
  return root.querySelector(`[${SUMMARY_MARKER}]`);
}

export function isSortSummary(node: Node): boolean {
  return node instanceof Element && node.hasAttribute(SUMMARY_MARKER);
}
