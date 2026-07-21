import { describe, expect, it } from 'vitest';
import { parseFrenchNumber } from './number';

describe('parseFrenchNumber', () => {
  it('reads a plain integer', () => {
    expect(parseFrenchNumber('640')).toBe(640);
  });

  it('reads a decimal written with a comma', () => {
    expect(parseFrenchNumber('55,5')).toBe(55.5);
  });

  // These are real, literal separator characters, indistinguishable from an
  // ordinary space in a diff, which is why each case carries its code
  // point in the label. Confusing them is the bug this function exists to
  // prevent, so do not "tidy" them into plain spaces.
  it.each([
    ['ordinary space (U+0020)', '1 250'],
    ['no-break space (U+00A0)', '1 250'],
    ['narrow no-break space (U+202F)', '1 250'],
    ['thin space (U+2009)', '1 250'],
    ['figure space (U+2007)', '1 250'],
  ])('treats a %s as a thousands separator', (_label, input) => {
    expect(parseFrenchNumber(input)).toBe(1250);
  });

  it('reads dots grouped in threes as a thousands separator', () => {
    expect(parseFrenchNumber('1.250')).toBe(1250);
    expect(parseFrenchNumber('1.250.375')).toBe(1250375);
  });

  it('reads a lone, ungrouped dot as a decimal point', () => {
    expect(parseFrenchNumber('55.5')).toBe(55.5);
  });

  it.each([
    ['empty', ''],
    ['whitespace only', '   '],
    ['letters', 'nous consulter'],
    ['a negative sign', '-640'],
    ['two decimal marks', '1,2,3'],
    ['a trailing unit', '640€'],
  ])('rejects %s', (_label, input) => {
    expect(parseFrenchNumber(input)).toBeNull();
  });

  it('never returns NaN', () => {
    for (const input of ['', 'abc', '..', ',,', '1..2']) {
      expect(parseFrenchNumber(input)).not.toBeNaN();
    }
  });
});
