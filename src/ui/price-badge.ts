import { describePricePerArea, formatPricePerArea } from '@/core/format';
import type { EurosPerSquareMetre } from '@/core/types';
import './price-badge.css';

/**
 * A single attribute identifies everything this extension has put on the page.
 * It is what makes the content script idempotent, what lets the observer ignore
 * its own mutations, and what makes "turn it off" a one-line query.
 */
export const BADGE_MARKER = 'data-lbc-prix-m2-badge';

/** Namespaced so nothing can collide with leboncoin's own utility classes. */
const CLASS = {
  root: 'lbc-prix-m2-badge',
  value: 'lbc-prix-m2-badge__value',
  assistive: 'lbc-prix-m2-badge__assistive',
} as const;

/**
 * Builds the badge that sits next to the price.
 *
 * Everything is created node by node and filled with `textContent`. No
 * `innerHTML`, ever: a content script that assembles markup from strings on a
 * page it does not control is one bad escape away from being the vulnerability.
 *
 * The two-span structure mirrors leboncoin's own accessibility pattern — a
 * visual element hidden from assistive technology, beside a spelled-out
 * sentence that only screen readers reach.
 */
export function createPriceBadge(doc: Document, value: EurosPerSquareMetre): HTMLElement {
  const label = formatPricePerArea(value);

  const root = doc.createElement('span');
  root.className = CLASS.root;
  // The marker doubles as the badge's cache key: comparing it against a freshly
  // computed label is how a re-render with new data is noticed.
  root.setAttribute(BADGE_MARKER, label);

  const visual = doc.createElement('span');
  visual.className = CLASS.value;
  visual.setAttribute('aria-hidden', 'true');
  visual.textContent = label;

  const assistive = doc.createElement('span');
  assistive.className = CLASS.assistive;
  assistive.textContent = describePricePerArea(value);

  root.append(visual, assistive);
  return root;
}

/** Every badge currently on the page. */
export function findBadges(root: ParentNode): Element[] {
  return Array.from(root.querySelectorAll(`[${BADGE_MARKER}]`));
}

/** The badge already attached to this card, if there is one. */
export function findBadgeIn(card: Element): Element | null {
  return card.querySelector(`[${BADGE_MARKER}]`);
}

/** The label a badge is currently displaying — its cache key. */
export function labelOf(badge: Element): string {
  return badge.getAttribute(BADGE_MARKER) ?? '';
}

/** True when the node is something this extension put on the page. */
export function isBadge(node: Node): boolean {
  return node instanceof Element && node.hasAttribute(BADGE_MARKER);
}
