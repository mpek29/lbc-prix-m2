import { describe, expect, it } from 'vitest';
import { describePricePerArea, formatAmount, formatPricePerArea } from './format';

/**
 * ICU switched the French group separator from U+00A0 to U+202F somewhere
 * around Node 18/20, and will likely move again. Asserting on the exact
 * separator would make these tests fail on a runtime upgrade for no good
 * reason, so we compare on a normalised form.
 */
const normalise = (value: string) => value.replace(/\s/g, ' ');

describe('formatAmount', () => {
  it('keeps one decimal for rental-sized figures', () => {
    expect(formatAmount(11.636)).toBe('11,6');
  });

  it('drops decimals for sale-sized figures', () => {
    expect(normalise(formatAmount(3192.31))).toBe('3 192');
  });

  it('rounds rather than truncates', () => {
    expect(formatAmount(11.65)).toBe('11,7');
    expect(normalise(formatAmount(3192.6))).toBe('3 193');
  });

  it('switches format exactly at the threshold', () => {
    expect(formatAmount(99.94)).toBe('99,9');
    expect(formatAmount(100)).toBe('100');
  });
});

describe('formatPricePerArea', () => {
  it('appends the unit', () => {
    expect(formatPricePerArea(11.636)).toBe('11,6 €/m²');
  });
});

describe('describePricePerArea', () => {
  it('spells the unit out for screen readers', () => {
    expect(describePricePerArea(11.636)).toBe('Prix au mètre carré : 11,6 euros.');
  });
});
