/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'scope-enum': [
      2,
      'always',
      ['core', 'site', 'ui', 'platform', 'app', 'entrypoints', 'build', 'ci', 'docs', 'deps'],
    ],
  },
};
