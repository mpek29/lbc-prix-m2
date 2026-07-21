/**
 * Finding leboncoin's sort control, which is harder than it looks.
 *
 * The obvious selector, `[role="radiogroup"]`, is wrong. Every ad card renders
 * its photo carousel's dot indicators as a radiogroup, so a results page holds
 * 35 of them and exactly one sort control. Taking the first match injects the
 * sort options into an ad photo.
 *
 * What separates them is the `value` attribute. The sort radios carry the value
 * that goes into the `sort` query parameter (`relevance`, `price,asc` and so
 * on). Carousel indicators carry `data-index` and no value at all.
 */

/** The values leboncoin's own sort radios use. Our own are not in this list. */
export const NATIVE_SORT_VALUES = [
  'relevance',
  'time,desc',
  'time,asc',
  'price,asc',
  'price,desc',
] as const;

/** How many native values a radiogroup must show before we believe it is the sort control. */
const MIN_RECOGNISED_VALUES = 2;

/** `Tri : Pertinence` on the chip that opens the sort menu. */
const CHIP_LABEL = /^\s*tri\s*:/i;

/**
 * The sort radiogroup, or `null` when the menu is closed.
 *
 * The menu is rendered on demand, so this returns `null` most of the time. That
 * is the normal case, not a failure.
 */
export function findSortRadioGroup(root: ParentNode): Element | null {
  for (const group of root.querySelectorAll('[role="radiogroup"]')) {
    const recognised = Array.from(group.querySelectorAll('[role="radio"][value]'), (radio) =>
      radio.getAttribute('value'),
    ).filter((value): value is string =>
      (NATIVE_SORT_VALUES as readonly string[]).includes(value ?? ''),
    );

    if (recognised.length >= MIN_RECOGNISED_VALUES) return group;
  }
  return null;
}

/** The rows of a sort radiogroup, each wrapping one radio and its label. */
export function findSortRows(group: Element): Element[] {
  const rows: Element[] = [];
  for (const radio of group.querySelectorAll('[role="radio"]')) {
    if (radio.parentElement) rows.push(radio.parentElement);
  }
  return rows;
}

/**
 * A row to copy when building our own.
 *
 * Cloning leboncoin's markup rather than writing our own is what keeps the
 * injected options looking native. Their radio is a Spark design-system
 * component with a dozen Tailwind classes and a pseudo-element for the dot;
 * reproducing that by hand would drift the first time they restyle it.
 */
export function findRowTemplate(group: Element): Element | null {
  const rows = findSortRows(group);
  // An unchecked row, so the clone starts in the state we want.
  return rows.find((row) => row.querySelector('[aria-checked="false"]')) ?? rows[0] ?? null;
}

/** Leboncoin's own radios, so we can clear them when one of ours takes over. */
export function findNativeRadios(group: Element): Element[] {
  return Array.from(group.querySelectorAll('[role="radio"][value]')).filter((radio) =>
    (NATIVE_SORT_VALUES as readonly string[]).includes(radio.getAttribute('value') ?? ''),
  );
}

/** The chip that opens the sort menu, so its label can echo the active sort. */
export function findSortChip(root: ParentNode): Element | null {
  for (const button of root.querySelectorAll('button')) {
    if (CHIP_LABEL.test(button.textContent ?? '')) return button;
  }
  return null;
}

/**
 * The element inside the chip holding its text.
 *
 * The chip also contains an icon, so writing to the button itself would delete
 * the chevron.
 */
export function findSortChipLabel(root: ParentNode): Element | null {
  const chip = findSortChip(root);
  if (!chip) return null;

  const spans = Array.from(chip.querySelectorAll('span'));
  return spans.find((span) => CHIP_LABEL.test(span.textContent ?? '')) ?? null;
}
