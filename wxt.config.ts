import { defineConfig } from 'wxt';

/**
 * A single source of truth for both targets.
 *
 * Everything that differs between Chrome and Firefox is expressed here as a
 * function of `browser`, so the rest of the codebase never has to branch on the
 * host. See docs/adr/0002-adopt-wxt-for-cross-browser-builds.md.
 */
export default defineConfig({
  srcDir: 'src',
  // `publicDir` resolves against the project root, not `srcDir`, so it has to be
  // spelled out to keep every shipped asset under `src/`.
  publicDir: 'src/public',
  outDir: '.output',
  // MV3 on both targets — see docs/adr/0006-target-manifest-v3-on-both-browsers.md
  manifestVersion: 3,
  manifest: ({ browser }) => ({
    name: 'Prix au m² pour leboncoin',
    short_name: 'Prix au m²',
    description:
      'Calcule et affiche le prix au mètre carré directement sur les annonces immobilières de leboncoin.',
    // The extension only ever reads the page it is already injected into and
    // writes one boolean to local storage. Nothing else is requested.
    permissions: ['storage'],
    ...(browser === 'firefox'
      ? {
          browser_specific_settings: {
            gecko: {
              // Required for signing, and for storage to survive an update.
              id: 'lbc-prix-m2@florian.p',
              // The first release that ships MV3 with a stable event page.
              strict_min_version: '115.0',
              // Mozilla has required an explicit declaration since November
              // 2025. Ours is the short one: we collect nothing.
              data_collection_permissions: { required: ['none'] },
            },
          },
        }
      : {}),
  }),
  webExt: {
    // Keep the dev profile between runs so logins and cookies survive a reload.
    keepProfileChanges: true,
    startUrls: ['https://www.leboncoin.fr/recherche?category=10'],
  },
});
