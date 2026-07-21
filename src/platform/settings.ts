import { storage } from '#imports';

/**
 * The extension's entire persisted state. One boolean, in local storage.
 *
 * `local:` rather than `sync:` on purpose: this is a per-device display
 * preference, and syncing it would mean asking for a permission and a privacy
 * commitment out of all proportion to what it stores.
 */
export const showBadges = storage.defineItem<boolean>('local:showBadges', {
  // On by default: an extension that does nothing until you find its settings
  // is an extension nobody keeps installed.
  fallback: true,
});

export interface Settings {
  readonly showBadges: boolean;
}

export async function readSettings(): Promise<Settings> {
  return { showBadges: await showBadges.getValue() };
}

/**
 * Calls `onChange` whenever the preference changes, including when it is
 * changed from the popup in another tab.
 *
 * @returns a function that stops watching.
 */
export function watchSettings(onChange: (settings: Settings) => void): () => void {
  return showBadges.watch((value) => onChange({ showBadges: value }));
}
