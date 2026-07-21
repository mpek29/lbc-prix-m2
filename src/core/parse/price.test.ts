import { describe, expect, it } from 'vitest';
import { parsePrice } from './price';

describe('parsePrice', () => {
  it('reads the visible price of a rental card', () => {
    expect(parsePrice('640 €')).toBe(640);
  });

  it('reads the screen-reader sentence leboncoin renders next to it', () => {
    expect(parsePrice('Prix: 640 €.')).toBe(640);
  });

  it('reads a six-figure sale price', () => {
    expect(parsePrice('249 000 €')).toBe(249000);
  });

  it('reads a price with cents', () => {
    expect(parsePrice('1 250,50 €')).toBe(1250.5);
  });

  it('accepts the EUR spelling', () => {
    expect(parsePrice('640 EUR')).toBe(640);
  });

  it('ignores numbers that are not attached to a currency', () => {
    expect(parsePrice('Appartement · 3 pièces · 55m² · Étage 1')).toBeNull();
  });

  it('anchors on the euro sign even when other numbers come first', () => {
    expect(parsePrice('3 pièces, 55 m², 640 €')).toBe(640);
  });

  it.each([
    ['no price at all', 'Prix à débattre'],
    ['a zero price', '0 €'],
    ['a placeholder price', '1 €'],
    ['an empty string', ''],
  ])('returns null for %s', (_label, input) => {
    expect(parsePrice(input)).toBeNull();
  });
});
