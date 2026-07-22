/**
 * Writing to the address bar.
 *
 * `replaceState` rather than `pushState`, always. Choosing a sort is not a
 * navigation, and pushing an entry would turn the browser's back button into a
 * sort-history stepper: press it once and you would expect to leave the search,
 * but instead the ordering changes.
 *
 * Every call is guarded. A content script shares the page's history object, and
 * a URL the page would refuse is not worth an exception on a feature that only
 * makes a link shareable.
 */

export function currentUrl(doc: Document): string {
  return doc.location.href;
}

export function replaceUrl(doc: Document, url: string): void {
  const view = doc.defaultView;
  if (!view) return;

  try {
    view.history.replaceState(view.history.state, '', url);
  } catch {
    // Same-origin rules, an unusual scheme, a sandboxed frame. The sort still
    // works; only the link stops being shareable.
  }
}
