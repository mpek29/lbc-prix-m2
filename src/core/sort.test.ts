import { describe, expect, it } from 'vitest';
import { sortByPricePerArea } from './sort';

const ad = (id: string, pricePerArea: number | null) => ({ id, pricePerArea });
const ids = (items: { id: string }[]) => items.map((item) => item.id);

describe('sortByPricePerArea', () => {
  it('puts the cheapest per square metre first when ascending', () => {
    const items = [ad('a', 3192), ad('b', 11.6), ad('c', 1945)];

    expect(ids(sortByPricePerArea(items, 'asc'))).toEqual(['b', 'c', 'a']);
  });

  it('reverses for descending', () => {
    const items = [ad('a', 3192), ad('b', 11.6), ad('c', 1945)];

    expect(ids(sortByPricePerArea(items, 'desc'))).toEqual(['a', 'c', 'b']);
  });

  it.each([['asc'], ['desc']] as const)('sinks unpriceable ads to the bottom (%s)', (direction) => {
    // A parking space has no surface. Scoring it as 0 would float it to the top
    // of "croissant", and as infinity to the top of "décroissant".
    const items = [ad('parking', null), ad('flat', 11.6), ad('house', 1945)];

    const sorted = ids(sortByPricePerArea(items, direction));

    expect(sorted[sorted.length - 1]).toBe('parking');
  });

  it('keeps unpriceable ads in their original order', () => {
    const items = [ad('x', null), ad('flat', 11.6), ad('y', null)];

    expect(ids(sortByPricePerArea(items, 'asc'))).toEqual(['flat', 'x', 'y']);
  });

  it('is stable, so ties keep leboncoin’s own ranking', () => {
    const items = [ad('first', 20), ad('second', 20), ad('third', 20)];

    expect(ids(sortByPricePerArea(items, 'asc'))).toEqual(['first', 'second', 'third']);
    expect(ids(sortByPricePerArea(items, 'desc'))).toEqual(['first', 'second', 'third']);
  });

  it('does not mutate the input', () => {
    const items = [ad('a', 3192), ad('b', 11.6)];

    sortByPricePerArea(items, 'asc');

    expect(ids(items)).toEqual(['a', 'b']);
  });

  it('handles an empty list and a single ad', () => {
    expect(sortByPricePerArea([], 'asc')).toEqual([]);
    expect(ids(sortByPricePerArea([ad('only', null)], 'desc'))).toEqual(['only']);
  });
});
