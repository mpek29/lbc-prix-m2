import { findResultsList } from './results-list';

/**
 * leboncoin's own pagination controls.
 *
 * Only needed so they can be put away while our sort is active. Once the
 * sorted list holds every result, their pager describes a paging that no longer
 * exists, and clicking it navigates off the page and discards the sort.
 *
 * Found through the links rather than a container selector, because the
 * container has no attribute worth binding to. Every page link carries a `page`
 * parameter, and nothing else on a results page does.
 */

/** The smallest element containing every page link, or `null`. */
export function findPagination(root: ParentNode): Element | null {
  const links = Array.from(root.querySelectorAll('a[href*="page="]'));
  if (links.length === 0) return null;

  let candidate: Element | null = links[0]!.parentElement;
  while (candidate && !links.every((link) => candidate!.contains(link))) {
    candidate = candidate.parentElement;
  }

  if (!candidate) return null;

  // Refuse anything that swallows the results themselves. A stray `page=` link
  // somewhere unrelated would otherwise walk the search upward until the
  // "pagination" is half the document, and hiding that hides the ads.
  const results = findResultsList(root);
  if (results && candidate.contains(results)) return null;
  if (candidate.tagName === 'BODY' || candidate.tagName === 'HTML') return null;

  return candidate;
}
