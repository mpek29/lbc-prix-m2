/**
 * The two options we add to leboncoin's sort menu.
 *
 * They are built by cloning one of leboncoin's own rows rather than by writing
 * the markup out. Their radio is a Spark design-system component: a dozen
 * Tailwind classes, a nested span, and a pseudo-element for the dot. Rewriting
 * that by hand would look right today and drift the first time they restyle it,
 * leaving two options that are visibly not part of the menu.
 *
 * Cloning also means we inherit whatever they change, for free.
 */

/** Marks a row as ours, for idempotency and for cleaning up. */
export const SORT_OPTION_MARKER = 'data-lbc-prix-m2-sort';

/** Values for our own options. Namespaced so they cannot collide with theirs. */
export const SORT_VALUE = {
  asc: 'lbc-prix-m2:asc',
  desc: 'lbc-prix-m2:desc',
} as const;

export interface SortOptionSpec {
  readonly value: string;
  readonly label: string;
  readonly checked: boolean;
}

/**
 * Clones a leboncoin row into one of ours.
 *
 * `data-radix-collection-item` is stripped on purpose. It is how Radix tracks
 * the radios it owns for keyboard navigation; leaving it on a row Radix never
 * rendered puts a node in its collection that its state machine knows nothing
 * about.
 */
export function createSortOption(template: Element, spec: SortOptionSpec): Element {
  const row = template.cloneNode(true) as Element;
  row.setAttribute(SORT_OPTION_MARKER, spec.value);

  const radio = row.querySelector('[role="radio"]');
  const label = row.querySelector('label');
  if (!radio || !label) return row;

  const id = `lbc-prix-m2-${spec.value.replace(/[^a-z]+/gi, '-')}`;
  radio.setAttribute('value', spec.value);
  radio.setAttribute('id', id);
  radio.setAttribute('aria-labelledby', `${id}-label`);
  radio.removeAttribute('data-radix-collection-item');

  label.setAttribute('for', id);
  label.setAttribute('id', `${id}-label`);
  label.textContent = spec.label;

  setOptionChecked(row, spec.checked);
  return row;
}

/**
 * Sets the visual state of a radio row, ours or leboncoin's.
 *
 * Their component keys its appearance off `data-state`, and screen readers off
 * `aria-checked`, so both have to move together.
 */
export function setOptionChecked(row: Element, checked: boolean): void {
  const state = checked ? 'checked' : 'unchecked';

  const radio = row.querySelector('[role="radio"]') ?? row;
  radio.setAttribute('aria-checked', String(checked));
  radio.setAttribute('data-state', state);

  // The dot itself is a nested span driven by its own data-state.
  for (const dot of radio.querySelectorAll('span')) dot.setAttribute('data-state', state);
}

/** Our rows currently in the menu. */
export function findSortOptions(root: ParentNode): Element[] {
  return Array.from(root.querySelectorAll(`[${SORT_OPTION_MARKER}]`));
}

/** True when the node is a sort row this extension added. */
export function isSortOption(node: Node): boolean {
  return node instanceof Element && node.hasAttribute(SORT_OPTION_MARKER);
}
