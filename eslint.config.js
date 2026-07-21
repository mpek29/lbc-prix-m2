import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

/**
 * The dependency rule of the architecture is enforced here rather than in a
 * README, because a rule nobody can break is worth more than a rule everybody
 * agrees with. See docs/architecture.md.
 *
 *   entrypoints ──▶ app ──▶ site / ui / platform ──▶ core
 *
 * Arrows only ever point right. `core` is pure: no DOM, no extension APIs, no
 * knowledge that leboncoin exists.
 */
const layer = (name, forbiddenPatterns, forbiddenGlobals = []) => ({
  files: [`src/${name}/**/*.ts`],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: forbiddenPatterns.map((group) => ({
          group: [group.pattern],
          message: group.message,
        })),
      },
    ],
    'no-restricted-globals': [
      'error',
      ...forbiddenGlobals.map((name_) => ({
        name: name_,
        message: `\`${name_}\` is not available to this layer — inject it from a layer that owns it.`,
      })),
    ],
  },
});

const OUTWARD = (from, to) => ({
  pattern: `@/${to}/*`,
  message: `\`${from}\` must not depend on \`${to}\`: dependencies point inward only.`,
});

const NO_PLATFORM = {
  pattern: '#imports',
  message: 'Extension APIs belong in `platform/`; this layer must stay portable.',
};

export default tseslint.config(
  {
    ignores: ['node_modules/', '.wxt/', '.output/', 'coverage/', '*.local'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.webextensions },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
    },
    rules: {
      eqeqeq: ['error', 'always'],
      // A content script shares its console with the host page; everything goes
      // through `platform/logger.ts`, which is namespaced and quiet in release
      // builds. That file is the one exemption, granted at the bottom.
      'no-console': 'error',
      'prefer-const': 'error',
      'no-param-reassign': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },

  // ── Architectural boundaries ───────────────────────────────────────────────
  layer(
    'core',
    [
      OUTWARD('core', 'site'),
      OUTWARD('core', 'ui'),
      OUTWARD('core', 'platform'),
      OUTWARD('core', 'app'),
      NO_PLATFORM,
    ],
    ['document', 'window', 'localStorage', 'fetch'],
  ),
  layer('site', [OUTWARD('site', 'ui'), OUTWARD('site', 'app'), NO_PLATFORM]),
  layer('ui', [OUTWARD('ui', 'site'), OUTWARD('ui', 'app'), NO_PLATFORM]),
  layer('platform', [
    OUTWARD('platform', 'site'),
    OUTWARD('platform', 'ui'),
    OUTWARD('platform', 'app'),
  ]),

  // Tests and entrypoints are allowed to reach across layers: one composes the
  // whole thing, the other verifies it.
  {
    files: ['src/**/*.test.ts', 'src/entrypoints/**/*.ts'],
    rules: { 'no-restricted-imports': 'off', 'no-restricted-globals': 'off' },
  },

  // The logger is the single sanctioned place where `console` is allowed.
  {
    files: ['src/platform/logger.ts'],
    rules: { 'no-console': 'off' },
  },

  // Build-time scripts run in Node, not in a page.
  {
    files: ['*.config.ts', '*.config.js', 'scripts/**/*.mjs', 'tools/**/*.mjs'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },

  // The visual harness is a development tool, not shipped code. Printing to the
  // console is the entire point of its logger.
  {
    files: ['tools/**/*.ts'],
    rules: { 'no-console': 'off' },
  },

  prettier,
);
