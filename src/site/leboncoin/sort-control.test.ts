import { beforeEach, describe, expect, it } from 'vitest';
import { fixture, fixtureList } from './__fixtures__/load';
import {
  findNativeRadios,
  findRowTemplate,
  findSortChip,
  findSortChipLabel,
  findSortRadioGroup,
  findSortRows,
} from './sort-control';

/** The chip that opens the sort menu, as leboncoin renders it. */
const CHIP = `<li><button type="button" aria-pressed="true" data-spark-component="chip"><span
  class="inline-block grow truncate">Tri : Pertinence</span><span class="flex h-full items-center"
  ><svg viewBox="0 0 24 24" aria-hidden="true"></svg></span></button></li>`;

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('findSortRadioGroup', () => {
  it('finds the sort control', () => {
    document.body.innerHTML = fixture('sort-radiogroup');

    expect(findSortRadioGroup(document)).not.toBeNull();
  });

  it('is not fooled by an ad card’s photo carousel', () => {
    // The bug this test exists for: every card renders its carousel dots as a
    // radiogroup, so a results page holds 35 of them. Selecting on
    // [role="radiogroup"] alone injects the sort options into an ad photo.
    document.body.innerHTML = fixture('carousel-radiogroup');

    expect(findSortRadioGroup(document)).toBeNull();
  });

  it('picks the sort control out of a page full of carousels', () => {
    document.body.innerHTML =
      fixture('carousel-radiogroup') +
      fixture('carousel-radiogroup') +
      fixture('sort-radiogroup') +
      fixture('carousel-radiogroup');

    const group = findSortRadioGroup(document);

    expect(group?.querySelector('[value="price,asc"]')).not.toBeNull();
  });

  it('returns null while the menu is closed, which is most of the time', () => {
    document.body.innerHTML = fixtureList('ad-card-rental');

    expect(findSortRadioGroup(document)).toBeNull();
  });

  it('needs more than one recognised value, so a stray radio is not enough', () => {
    document.body.innerHTML = `<div role="radiogroup">
      <span><button role="radio" value="relevance"></button><label>Pertinence</label></span>
    </div>`;

    expect(findSortRadioGroup(document)).toBeNull();
  });
});

describe('findSortRows', () => {
  it('finds every option leboncoin offers', () => {
    document.body.innerHTML = fixture('sort-radiogroup');
    const group = findSortRadioGroup(document);

    const labels = findSortRows(group!).map((row) => row.querySelector('label')?.textContent);

    expect(labels).toEqual([
      'Pertinence',
      'Plus récentes',
      'Plus anciennes',
      'Prix croissants',
      'Prix décroissants',
    ]);
  });
});

describe('findRowTemplate', () => {
  it('hands back an unchecked row, so a clone starts in the right state', () => {
    document.body.innerHTML = fixture('sort-radiogroup');
    const group = findSortRadioGroup(document);

    const template = findRowTemplate(group!);

    expect(template?.querySelector('[role="radio"]')?.getAttribute('aria-checked')).toBe('false');
  });
});

describe('findNativeRadios', () => {
  it('finds leboncoin’s own radios and none of ours', () => {
    document.body.innerHTML = fixture('sort-radiogroup');
    const group = findSortRadioGroup(document);
    // Something that looks like a row but is not leboncoin's.
    group!.insertAdjacentHTML(
      'beforeend',
      '<span><button role="radio" value="area,asc"></button></span>',
    );

    const values = findNativeRadios(group!).map((radio) => radio.getAttribute('value'));

    expect(values).toEqual(['relevance', 'time,desc', 'time,asc', 'price,asc', 'price,desc']);
  });
});

describe('findSortChip', () => {
  it('finds the chip by its label', () => {
    document.body.innerHTML = `<ul>${CHIP}</ul>`;

    expect(findSortChip(document)?.tagName).toBe('BUTTON');
  });

  it('ignores other chips on the filter bar', () => {
    document.body.innerHTML = `<ul><li><button>Prix</button></li><li><button>Type de bien</button></li></ul>`;

    expect(findSortChip(document)).toBeNull();
  });

  it('targets the text span, not the button, so the chevron survives', () => {
    document.body.innerHTML = `<ul>${CHIP}</ul>`;

    const label = findSortChipLabel(document);
    label!.textContent = 'Tri : Prix/m² croissant';

    expect(document.querySelector('svg')).not.toBeNull();
    expect(findSortChip(document)?.textContent).toContain('Prix/m²');
  });
});
