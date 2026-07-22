/**
 * Fetching further pages of a search.
 *
 * This is the one place in the extension that touches the network, and it is
 * written to be a considerate guest. Requests go out one at a time with a pause
 * between them, and the whole run can be abandoned mid-flight. A parallel burst
 * would be faster and is exactly the traffic shape that gets a reader's IP
 * shown a CAPTCHA for the rest of the evening.
 */

export interface FetchPagesOptions {
  /** Milliseconds to wait between requests. */
  readonly delayMs: number;
  /** Called after each page arrives, for progress reporting. */
  readonly onPage?: (doc: Document, index: number) => void;
  readonly signal?: AbortSignal;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(timer);
        reject(new DOMException('aborted', 'AbortError'));
      },
      { once: true },
    );
  });

/**
 * Fetches one page and parses it.
 *
 * `credentials: 'same-origin'` matters: the reader is often logged in, and a
 * request without their session can come back as a different, generic page.
 */
export async function fetchDocument(url: string, signal?: AbortSignal): Promise<Document> {
  const response = await fetch(url, {
    credentials: 'same-origin',
    headers: { Accept: 'text/html' },
    ...(signal ? { signal } : {}),
  });

  if (!response.ok) throw new Error(`${response.status} for ${url}`);

  return new DOMParser().parseFromString(await response.text(), 'text/html');
}

/**
 * Yields pages in order, pausing between them.
 *
 * A generator rather than a list, so the caller can stop the moment a page
 * stops being useful. That matters more than it sounds: leboncoin sits behind
 * DataDome, and a challenge arrives as a perfectly valid 200 with no ads in it.
 * Something has to notice that and stop asking, and only the caller can tell an
 * empty page from a blocked one.
 *
 * Stops at the first hard failure too. A 429 means the site is asking us to
 * stop, and the polite reading of that is to stop, keep what we have, and tell
 * the reader.
 */
export async function* fetchPagesSequentially(
  urls: readonly string[],
  options: FetchPagesOptions,
): AsyncGenerator<Document> {
  for (const [index, url] of urls.entries()) {
    if (options.signal?.aborted) return;
    if (index > 0) await sleep(options.delayMs, options.signal);

    let doc: Document;
    try {
      doc = await fetchDocument(url, options.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      throw error;
    }

    options.onPage?.(doc, index);
    yield doc;
  }
}
