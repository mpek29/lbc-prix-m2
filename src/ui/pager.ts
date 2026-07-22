import './pager.css';

/**
 * Our own pagination, shown while a €/m² sort is active.
 *
 * The sorted list holds every result at once, which is not how leboncoin
 * presents a search and not how anyone wants to read 700 ads. This puts the
 * familiar shape back: a page at a time, in sorted order, without leaving the
 * page or losing the sort.
 *
 * It is a real `<nav>` with real buttons rather than links. A link implies a
 * destination, and there is none here: nothing is fetched, nothing navigates,
 * the list is re-rendered from ads already in memory.
 */
export const PAGER_MARKER = 'data-lbc-prix-m2-pager';

const CLASS = {
  root: 'lbc-prix-m2-pager',
  button: 'lbc-prix-m2-pager__button',
  status: 'lbc-prix-m2-pager__status',
} as const;

export interface PagerState {
  /** One-based, to match what the reader is shown. */
  readonly page: number;
  readonly pages: number;
}

export interface PagerOptions extends PagerState {
  readonly onSelect: (page: number) => void;
}

export function createPager(doc: Document, options: PagerOptions): HTMLElement {
  const root = doc.createElement('nav');
  root.className = CLASS.root;
  root.setAttribute(PAGER_MARKER, '');
  root.setAttribute('aria-label', 'Pagination du tri par prix au mètre carré');

  const previous = button(doc, '‹ Précédente', () => options.onSelect(current(root) - 1));
  previous.dataset.role = 'previous';

  const status = doc.createElement('span');
  status.className = CLASS.status;
  // Announced on change, so a screen reader reports the new page rather than
  // leaving the reader to guess whether the button did anything.
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const next = button(doc, 'Suivante ›', () => options.onSelect(current(root) + 1));
  next.dataset.role = 'next';

  root.append(previous, status, next);
  updatePager(root, options);
  return root;
}

export function updatePager(pager: Element, state: PagerState): void {
  pager.setAttribute('data-page', String(state.page));

  const status = pager.querySelector(`.${CLASS.status}`);
  if (status) status.textContent = `Page ${state.page} sur ${state.pages}`;

  toggle(pager, 'previous', state.page <= 1);
  toggle(pager, 'next', state.page >= state.pages);
}

export function findPager(root: ParentNode): Element | null {
  return root.querySelector(`[${PAGER_MARKER}]`);
}

export function isPager(node: Node): boolean {
  return node instanceof Element && node.hasAttribute(PAGER_MARKER);
}

function button(doc: Document, label: string, onClick: () => void): HTMLButtonElement {
  const element = doc.createElement('button');
  element.type = 'button';
  element.className = CLASS.button;
  element.textContent = label;
  element.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return element;
}

/** The page the control is currently showing, read back off the DOM. */
function current(pager: Element): number {
  return Number(pager.getAttribute('data-page') ?? '1');
}

function toggle(pager: Element, role: string, disabled: boolean): void {
  const element = pager.querySelector<HTMLButtonElement>(`[data-role="${role}"]`);
  if (element) element.disabled = disabled;
}
