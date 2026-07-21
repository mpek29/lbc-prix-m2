import { beforeEach, describe, expect, it } from 'vitest';
import { fixture } from '@/site/leboncoin/__fixtures__/load';
import { findRowTemplate, findSortRadioGroup } from '@/site/leboncoin/sort-control';
import {
  createSortOption,
  findSortOptions,
  isSortOption,
  setOptionChecked,
  SORT_OPTION_MARKER,
  SORT_VALUE,
} from './sort-option';

let template: Element;

beforeEach(() => {
  document.body.innerHTML = fixture('sort-radiogroup');
  template = findRowTemplate(findSortRadioGroup(document)!)!;
});

const build = (checked = false) =>
  createSortOption(template, { value: SORT_VALUE.asc, label: 'Prix/m² croissant', checked });

describe('createSortOption', () => {
  it('carries the label the reader will see', () => {
    expect(build().querySelector('label')?.textContent).toBe('Prix/m² croissant');
  });

  it('keeps leboncoin’s own classes, so it looks like part of the menu', () => {
    const option = build();

    expect(option.getAttribute('class')).toBe(template.getAttribute('class'));
    expect(option.querySelector('[role="radio"]')?.getAttribute('class')).toBe(
      template.querySelector('[role="radio"]')?.getAttribute('class'),
    );
  });

  it('does not join Radix’s collection', () => {
    // data-radix-collection-item is how Radix tracks the radios it rendered.
    // Leaving it on puts a node in its keyboard-navigation state machine that
    // it never created.
    expect(template.querySelector('[data-radix-collection-item]')).not.toBeNull();
    expect(build().querySelector('[data-radix-collection-item]')).toBeNull();
  });

  it('links the label to its radio with ids that cannot collide', () => {
    const option = build();
    const radio = option.querySelector('[role="radio"]')!;
    const label = option.querySelector('label')!;

    expect(label.getAttribute('for')).toBe(radio.getAttribute('id'));
    expect(radio.getAttribute('id')).not.toBe(
      template.querySelector('[role="radio"]')?.getAttribute('id'),
    );
  });

  it('is findable and removable afterwards', () => {
    document.body.append(build());

    expect(findSortOptions(document)).toHaveLength(1);
    expect(isSortOption(build())).toBe(true);
    expect(isSortOption(template)).toBe(false);
  });

  it('starts unchecked, or checked when asked', () => {
    expect(build(false).querySelector('[role="radio"]')?.getAttribute('aria-checked')).toBe(
      'false',
    );
    expect(build(true).querySelector('[role="radio"]')?.getAttribute('aria-checked')).toBe('true');
  });

  it('tags itself with the value it represents', () => {
    expect(build().getAttribute(SORT_OPTION_MARKER)).toBe(SORT_VALUE.asc);
  });
});

describe('setOptionChecked', () => {
  it('moves aria-checked and data-state together', () => {
    // The Spark component paints from data-state; screen readers read
    // aria-checked. Updating one and not the other gives a radio that looks
    // selected and announces that it is not.
    const option = build(false);

    setOptionChecked(option, true);

    const radio = option.querySelector('[role="radio"]')!;
    expect(radio.getAttribute('aria-checked')).toBe('true');
    expect(radio.getAttribute('data-state')).toBe('checked');
    expect(radio.querySelector('span')?.getAttribute('data-state')).toBe('checked');
  });

  it('clears one of leboncoin’s own rows', () => {
    const native = document.querySelector('[value="relevance"]')!.parentElement!;

    setOptionChecked(native, false);

    expect(native.querySelector('[role="radio"]')?.getAttribute('aria-checked')).toBe('false');
    expect(native.querySelector('[role="radio"]')?.getAttribute('data-state')).toBe('unchecked');
  });
});
