import type { Listing, SquareMetres } from '@/core/types';
import { parseArea } from '@/core/parse/area';
import { parsePrice } from '@/core/parse/price';
import {
  AD_CARD,
  AD_ID_IN_HREF,
  AD_LINK,
  LABELLED,
  PRICE_SENTENCE_PREFIX,
  SCREEN_READER_TEXT,
  VISUAL_ONLY,
} from './selectors';

/** Why a card produced no listing. Reported, not thrown — see `AdCardReading`. */
export type SkipReason = 'no-price' | 'no-area';

export type AdCardReading =
  | {
      readonly kind: 'listing';
      readonly listing: Listing;
      /**
       * The element the badge should be inserted after — leboncoin's own price
       * paragraph. Handing the caller a node rather than a selector keeps DOM
       * knowledge inside this layer.
       */
      readonly priceAnchor: Element;
    }
  | { readonly kind: 'skipped'; readonly reason: SkipReason };

export interface ReadOptions {
  /**
   * Identifies nodes this extension put on the page.
   *
   * This adapter's contract is "read leboncoin's DOM". Once a badge has been
   * inserted, part of the card is no longer leboncoin's, and a reader that
   * cannot tell the difference will happily parse `11,6 €/m²` back out of its
   * own output — anchoring the next badge to the previous one, and drifting a
   * little further from the price on every pass.
   */
  readonly isInjected?: (node: Node) => boolean;
}

const NOTHING_IS_INJECTED = () => false;

/** Every ad card currently in the document, in visual order. */
export function findAdCards(root: ParentNode): Element[] {
  return Array.from(root.querySelectorAll(AD_CARD));
}

/**
 * Turns one ad card into a domain `Listing`.
 *
 * A skip is a normal outcome, not an error: parking spaces have no surface,
 * some professional ads have no price. Roughly one card in ten on a mixed
 * search page legitimately produces no result.
 */
export function readAdCard(card: Element, options: ReadOptions = {}): AdCardReading {
  const isInjected = options.isInjected ?? NOTHING_IS_INJECTED;

  const price = locatePrice(card, isInjected);
  if (!price) return { kind: 'skipped', reason: 'no-price' };

  const amount = parsePrice(price.text);
  if (amount === null) return { kind: 'skipped', reason: 'no-price' };

  const area = readArea(card, isInjected);
  if (area === null) return { kind: 'skipped', reason: 'no-area' };

  return {
    kind: 'listing',
    listing: { id: readAdId(card), price: amount, area },
    priceAnchor: price.anchor,
  };
}

// ── Price ────────────────────────────────────────────────────────────────────

interface PriceLocation {
  /** Raw text to hand to the domain parser. */
  readonly text: string;
  /** The visible price element, which the badge will sit next to. */
  readonly anchor: Element;
}

type InjectedPredicate = (node: Node) => boolean;

/**
 * leboncoin renders every price twice: once visually with `aria-hidden`, and
 * once as a sentence for screen readers. We try the screen-reader copy first —
 * it is unambiguous ("Prix: 640 €.") and cannot collide with a promotional
 * banner — then fall back to the visual one.
 */
function locatePrice(card: Element, isInjected: InjectedPredicate): PriceLocation | null {
  return (
    locatePriceFromScreenReaderText(card, isInjected) ??
    locatePriceFromVisibleText(card, isInjected)
  );
}

function locatePriceFromScreenReaderText(
  card: Element,
  isInjected: InjectedPredicate,
): PriceLocation | null {
  for (const node of card.querySelectorAll(SCREEN_READER_TEXT)) {
    if (isWithinInjected(node, card, isInjected)) continue;

    const text = node.textContent ?? '';
    if (!PRICE_SENTENCE_PREFIX.test(text)) continue;

    // The visual price is the sibling this sentence describes; anchoring on it
    // puts the badge beside the price rather than beside invisible text. Our
    // own badge already sits in that gap, so it has to be stepped over.
    let anchor = node.previousElementSibling;
    while (anchor && isInjected(anchor)) anchor = anchor.previousElementSibling;

    return { text, anchor: anchor ?? node };
  }
  return null;
}

function locatePriceFromVisibleText(
  card: Element,
  isInjected: InjectedPredicate,
): PriceLocation | null {
  const candidates = Array.from(card.querySelectorAll(VISUAL_ONLY)).filter(
    (node) => (node.textContent ?? '').includes('€') && !isWithinInjected(node, card, isInjected),
  );

  // Several ancestors can contain the euro sign; the deepest one is the price
  // itself rather than a container that happens to wrap it.
  const deepest = candidates.reduce<Element | null>(
    (best, node) =>
      best === null || node.querySelectorAll('*').length < best.querySelectorAll('*').length
        ? node
        : best,
    null,
  );

  return deepest ? { text: deepest.textContent ?? '', anchor: deepest } : null;
}

// ── Surface ──────────────────────────────────────────────────────────────────

/**
 * Surfaces are read from accessible names before visible text. `<article
 * aria-label="Appartement, 3 pièces, 55 mètres carrés.">` is written by
 * leboncoin for screen readers and is far more regular than the bullet-
 * separated title, which varies by category.
 */
function readArea(card: Element, isInjected: InjectedPredicate): SquareMetres | null {
  const sources = [
    card.closest('article')?.getAttribute('aria-label'),
    ...Array.from(card.querySelectorAll(LABELLED), (node) => node.getAttribute('aria-label')),
    // Last resort. Whole-card text is the widest net and therefore the easiest
    // to fool, so it only ever runs when the accessible names came up empty.
    textOf(card, isInjected),
  ];

  for (const source of sources) {
    const area = source === null || source === undefined ? null : parseArea(source);
    if (area !== null) return area;
  }

  return null;
}

/** `textContent`, minus any subtree this extension is responsible for. */
function textOf(node: Node, isInjected: InjectedPredicate): string {
  if (isInjected(node)) return '';
  if (node.nodeType === node.TEXT_NODE) return node.nodeValue ?? '';

  let text = '';
  for (const child of node.childNodes) text += textOf(child, isInjected);
  return text;
}

// ── Identity ─────────────────────────────────────────────────────────────────

function readAdId(card: Element): string | null {
  const href = card.querySelector(AD_LINK)?.getAttribute('href') ?? '';
  return AD_ID_IN_HREF.exec(href)?.[1] ?? null;
}

// ── Shared ───────────────────────────────────────────────────────────────────

/** True when `node`, or anything between it and the card, is ours. */
function isWithinInjected(node: Element, card: Element, isInjected: InjectedPredicate): boolean {
  for (let current: Element | null = node; current && current !== card;) {
    if (isInjected(current)) return true;
    current = current.parentElement;
  }
  return false;
}
