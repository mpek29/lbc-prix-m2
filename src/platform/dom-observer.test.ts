import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { observeMutations } from './dom-observer';

/** Long enough for a mutation record to be delivered and a frame to be served. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

let stop: (() => void) | null = null;

beforeEach(() => {
  document.body.innerHTML = '';
});

afterEach(() => {
  stop?.();
  stop = null;
});

const append = (marker?: string) => {
  const node = document.createElement('div');
  if (marker !== undefined) node.setAttribute(marker, '');
  document.body.append(node);
  return node;
};

describe('observeMutations', () => {
  it('reports a node being added', async () => {
    const onChange = vi.fn();
    stop = observeMutations(document.body, onChange);

    append();
    await settle();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('coalesces a burst of mutations into a single call', async () => {
    // A single scroll on leboncoin produces hundreds of records. Re-scanning the
    // document for each one is how an extension becomes the reason a page lags.
    const onChange = vi.fn();
    stop = observeMutations(document.body, onChange);

    for (let i = 0; i < 50; i += 1) append();
    await settle();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('ignores mutations it caused itself', async () => {
    // Without this the extension would insert a badge, observe the insertion,
    // and insert again — forever.
    const onChange = vi.fn();
    stop = observeMutations(document.body, onChange, {
      isOwnNode: (node) => node instanceof Element && node.hasAttribute('data-ours'),
    });

    append('data-ours');
    await settle();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('still reports a batch that mixes our nodes with theirs', async () => {
    const onChange = vi.fn();
    stop = observeMutations(document.body, onChange, {
      isOwnNode: (node) => node instanceof Element && node.hasAttribute('data-ours'),
    });

    append('data-ours');
    append();
    await settle();

    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('goes quiet once stopped', async () => {
    const onChange = vi.fn();
    const dispose = observeMutations(document.body, onChange);

    dispose();
    append();
    await settle();

    expect(onChange).not.toHaveBeenCalled();
  });

  it('cancels work already scheduled when stopped mid-flight', async () => {
    const onChange = vi.fn();
    const dispose = observeMutations(document.body, onChange);

    append();
    dispose(); // before the pending frame runs
    await settle();

    expect(onChange).not.toHaveBeenCalled();
  });
});
