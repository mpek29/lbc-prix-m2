import { describe, expect, it } from 'vitest';
import { parseArea } from './area';

describe('parseArea', () => {
  it('reads the surface out of a card title', () => {
    expect(parseArea('Appartement · 3 pièces · 55m² · Étage 1')).toBe(55);
  });

  it('reads the surface out of the accessible label', () => {
    expect(parseArea('Appartement, 3 pièces, 55 mètres carrés.')).toBe(55);
  });

  it('does not mistake the room count for the surface', () => {
    expect(parseArea('Appartement · 3 pièces · 55m²')).toBe(55);
    expect(parseArea('Maison, 12 pièces, 240 mètres carrés.')).toBe(240);
  });

  it('accepts the m2 spelling and a space before the unit', () => {
    expect(parseArea('60 m2')).toBe(60);
    expect(parseArea('60 m²')).toBe(60);
  });

  it('reads a decimal surface', () => {
    expect(parseArea('55,5 m²')).toBe(55.5);
  });

  it.each([
    ['a listing with no surface', 'Parking · Concarneau'],
    ['a surface too small to be living space', '2 m²'],
    ['a plot of land', '25000 m²'],
    ['an empty string', ''],
  ])('returns null for %s', (_label, input) => {
    expect(parseArea(input)).toBeNull();
  });
});
