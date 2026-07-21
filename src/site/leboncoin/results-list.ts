import { AD_CARD } from './selectors';

/**
 * The list holding the results, and the items inside it.
 *
 * leboncoin's results container is a bare `<ul>` with no class and no
 * attributes, so there is nothing to select it by. Rather than guess, we find
 * it through a card we have already located: every ad card on the page shares
 * the same list, so its `<li>` parent is the list.
 */

/** The `<li>` wrapping one ad card, which is the unit that gets reordered. */
export function findCardItem(card: Element): Element | null {
  return card.closest('li');
}

/** The results list, found through the cards it contains. */
export function findResultsList(root: ParentNode): Element | null {
  const card = root.querySelector(AD_CARD);
  return card ? (findCardItem(card)?.parentElement ?? null) : null;
}
