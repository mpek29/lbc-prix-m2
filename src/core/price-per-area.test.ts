import { describe, expect, it } from 'vitest';
import { computePricePerArea, pricePerAreaOf } from './price-per-area';

describe('computePricePerArea', () => {
  it('divides a monthly rent by its surface', () => {
    // The card this project was built from: 640 € for 55 m².
    expect(computePricePerArea(640, 55)).toBeCloseTo(11.636, 3);
  });

  it('divides a sale price by its surface', () => {
    expect(computePricePerArea(249_000, 78)).toBeCloseTo(3192.3, 1);
  });

  it.each([
    ['a zero surface', 640, 0],
    ['a negative surface', 640, -55],
    ['a zero price', 0, 55],
    ['a non-finite price', Number.POSITIVE_INFINITY, 55],
    ['a NaN surface', 640, Number.NaN],
  ])('refuses to answer for %s', (_label, price, area) => {
    expect(computePricePerArea(price, area)).toBeNull();
  });

  it('refuses a result that is too high to be a real listing', () => {
    // 500 000 € for 1 m² means we matched the wrong surface, not a bargain.
    expect(computePricePerArea(500_000, 1)).toBeNull();
  });

  it('refuses a result that is too low to be a real listing', () => {
    expect(computePricePerArea(50, 500)).toBeNull();
  });
});

describe('pricePerAreaOf', () => {
  it('reads the figures off a listing', () => {
    expect(pricePerAreaOf({ id: '3218511921', price: 640, area: 55 })).toBeCloseTo(11.636, 3);
  });
});
