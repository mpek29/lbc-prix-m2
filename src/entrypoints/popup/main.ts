import { showBadges } from '@/platform/settings';

/**
 * One control, one setting. The popup deliberately holds no state of its own:
 * storage is the source of truth, and the checkbox is a view of it.
 */
const toggle = document.querySelector<HTMLInputElement>('#show-badges');
const status = document.querySelector<HTMLElement>('#status');

const ENABLED_HINT = 'Ouvrez une recherche immobilière sur leboncoin.';
const DISABLED_HINT = 'Les annonces s’affichent telles que leboncoin les envoie.';

function render(enabled: boolean): void {
  if (toggle) toggle.checked = enabled;
  if (status) status.textContent = enabled ? ENABLED_HINT : DISABLED_HINT;
}

render(await showBadges.getValue());

toggle?.addEventListener('change', () => {
  const enabled = toggle.checked;
  render(enabled);
  // Fire and forget: the content script is watching storage, so the page
  // updates on its own. Blocking the checkbox on a write would only make the
  // toggle feel laggy.
  void showBadges.setValue(enabled);
});
