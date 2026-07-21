/**
 * leboncoin is a Next.js application: results arrive after hydration, more
 * arrive on scroll, and navigating between searches replaces the list without a
 * page load. A content script that runs once at `document_end` sees an empty
 * page and nothing else, so the real entry point is this observer.
 */

export interface ObserveOptions {
  /**
   * Identifies nodes this extension added itself. Without it, inserting a badge
   * triggers the observer, which inserts a badge, which triggers the observer.
   */
  readonly isOwnNode?: (node: Node) => boolean;
}

/**
 * Watches a subtree and calls `onChange` at most once per animation frame.
 *
 * Coalescing matters more than it looks: a single scroll can produce hundreds
 * of mutation records, and re-scanning the document for each of them is how an
 * extension ends up being the reason a page feels slow.
 *
 * @returns a function that disconnects the observer and cancels pending work.
 */
export function observeMutations(
  target: Node,
  onChange: () => void,
  options: ObserveOptions = {},
): () => void {
  const isOwnNode = options.isOwnNode ?? (() => false);
  let pendingFrame: number | null = null;

  const observer = new MutationObserver((records) => {
    if (records.every((record) => isSelfInflicted(record, isOwnNode))) return;
    if (pendingFrame !== null) return;

    // In a background tab this frame never fires; the callback runs when the
    // tab is shown again, which is the first moment it could matter anyway.
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      onChange();
    });
  });

  observer.observe(target, { childList: true, subtree: true });

  return () => {
    observer.disconnect();
    if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
    pendingFrame = null;
  };
}

/** True when a record describes nothing but our own additions and removals. */
function isSelfInflicted(record: MutationRecord, isOwnNode: (node: Node) => boolean): boolean {
  const touched = [...record.addedNodes, ...record.removedNodes];
  return touched.length > 0 && touched.every(isOwnNode);
}
