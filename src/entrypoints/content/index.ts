import { defineContentScript } from '#imports';
import { createEnhancer } from '@/app/create-enhancer';
import { createLogger } from '@/platform/logger';
import { readSettings, watchSettings } from '@/platform/settings';

/**
 * The shell. It owns nothing: it resolves the environment (document, settings,
 * logger), hands them to the composition root, and gets out of the way.
 *
 * Everything below this file is testable without a browser, which is the whole
 * point of keeping it this short.
 */
export default defineContentScript({
  matches: ['*://www.leboncoin.fr/*'],
  // The list is rendered client-side, so there is nothing to read at
  // `document_start`; the observer inside the enhancer picks it up from here.
  runAt: 'document_end',
  allFrames: false,

  async main() {
    const logger = createLogger('lbc-prix-m2');
    const enhancer = createEnhancer(document, logger);

    const apply = (showBadges: boolean) => (showBadges ? enhancer.start() : enhancer.stop());

    try {
      apply((await readSettings()).showBadges);
    } catch (error) {
      // A storage failure must not cost the user the feature: default to on.
      logger.error('could not read settings, defaulting to enabled', error);
      enhancer.start();
    }

    // Reflect the popup toggle immediately, in every open tab.
    watchSettings((settings) => apply(settings.showBadges));
  },
});
