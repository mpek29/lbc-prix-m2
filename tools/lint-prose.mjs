/**
 * Fails on the punctuation and filler that make prose read as machine-written.
 *
 *   npm run lint:prose
 *
 * The rules are blunt on purpose. The em dash is the loudest tell, so it is
 * banned outright: a comma, a colon, a full stop or a pair of parentheses
 * always covers the same job. The word list is short and catches the reflexive
 * intensifiers ("deliberately", "genuinely") that add length without meaning.
 *
 * Scope is prose and the comments a reader meets first: Markdown, issue
 * templates and workflows, and the source and config files whose header
 * comments explain the project. Captured fixtures are left alone (verbatim
 * recordings), and this file is too (it has to name the characters it bans).
 */
import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const GLOBS = [
  '*.md',
  '.github/**/*.yml',
  'tools/**/*.html',
  'src/**/*.ts',
  'src/**/*.css',
  '*.ts',
  '*.js',
  'scripts/**/*.mjs',
  'tools/**/*.mjs',
];

const FILES = execSync(`git ls-files ${GLOBS.map((g) => `"${g}"`).join(' ')}`, {
  encoding: 'utf8',
})
  .split('\n')
  .filter(Boolean)
  .filter((path) => !path.includes('__fixtures__'))
  .filter((path) => path !== 'tools/lint-prose.mjs');

/** [pattern, human-readable reason]. Patterns run per line. */
const RULES = [
  [/—/, 'em dash: use a comma, a colon, a full stop, or parentheses'],
  [/–/, 'en dash: use a hyphen for ranges, or the word "to"'],
  [/\bdeliberately\b/i, 'filler: say what it does, not that it was intentional'],
  [/\bgenuinely\b/i, 'filler intensifier'],
  [/\bhonestly\b/i, 'filler intensifier'],
  [/\bprecisely\b/i, 'filler intensifier, "exactly" is usually enough'],
  [/\bis not [^,.]+, it is\b/i, 'the "not X, it is Y" antithesis reads as generated'],
];

let failures = 0;

for (const path of FILES) {
  const lines = readFileSync(path, 'utf8').split('\n');
  lines.forEach((line, index) => {
    // Skip fenced-code and inline-code spans: a hyphen in a shell command is
    // not prose, and neither is a box-drawing diagram.
    const prose = line.replace(/`[^`]*`/g, '');
    for (const [pattern, reason] of RULES) {
      if (pattern.test(prose)) {
        console.error(`${path}:${index + 1}  ${reason}`);
        console.error(`  ${line.trim()}`);
        failures += 1;
      }
    }
  });
}

if (failures > 0) {
  console.error(`\n${failures} prose issue${failures === 1 ? '' : 's'}.`);
  process.exit(1);
}
console.log(`prose ok (${FILES.length} files)`);
