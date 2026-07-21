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
 * Fetches pages in order, pausing between them.
 *
 * Stops at the first failure rather than pressing on. A 429 or a CAPTCHA
 * redirect means the site is asking us to stop, and the polite reading of that
 * is to stop, keep what we already have, and tell the reader.
 *
 * @returns the documents fetched before stopping, which may be fewer than asked
 * for.
 */
export async function fetchPages(
  urls: readonly string[],
  options: FetchPagesOptions,
): Promise<Document[]> {
  const documents: Document[] = [];

  for (const [index, url] of urls.entries()) {
    if (options.signal?.aborted) break;
    if (index > 0) await sleep(options.delayMs, options.signal);

    try {
      const doc = await fetchDocument(url, options.signal);
      documents.push(doc);
      options.onPage?.(doc, index);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') break;
      throw error;
    }
  }

  return documents;
}
