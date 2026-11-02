#!/usr/bin/env node
/**
 * Prints coverage/coverage-summary.json (written by `npm run test:coverage`) as Markdown, for the
 * GitHub job summary: totals, each entry point, and every file below 100 %.
 *
 *   node scripts/coverage-summary.mjs >> "$GITHUB_STEP_SUMMARY"
 */
import { existsSync, readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const METRICS = ['statements', 'branches', 'functions', 'lines'];
const ENTRY_POINTS = [
  ['Core (`.`)', 'projects/ng-spotlight/src/'],
  ['PrimeNG (`./primeng`)', 'projects/ng-spotlight/primeng/'],
];

function add(into, file) {
  for (const m of METRICS) {
    into[m] ??= { total: 0, covered: 0 };
    into[m].total += file[m].total;
    into[m].covered += file[m].covered;
  }
  return into;
}

const pct = (m) => (m.total === 0 ? 100 : (m.covered / m.total) * 100);
const row = (name, data) => `| ${name} | ${METRICS.map((m) => `${pct(data[m]).toFixed(2)} %`).join(' | ')} |`;

/** @param {Record<string, any>} summary the parsed coverage-summary.json  @param {string} root */
export function coverageMarkdown(summary, root) {
  const files = Object.entries(summary)
    .filter(([key]) => key !== 'total')
    .map(([key, data]) => [relative(root, key).replace(/\\/g, '/'), data]);
  const lines = ['## Coverage', '', `| | ${METRICS.join(' | ')} |`, `|---|${METRICS.map(() => '---:').join('|')}|`];
  lines.push(row('**All files**', summary.total));
  for (const [label, prefix] of ENTRY_POINTS) {
    const inEntry = files.filter(([path]) => path.startsWith(prefix));
    if (inEntry.length > 0) lines.push(row(label, inEntry.reduce((acc, [, data]) => add(acc, data), {})));
  }
  const partial = files.filter(([, data]) => METRICS.some((m) => pct(data[m]) < 100));
  if (partial.length > 0) {
    lines.push('', '<details><summary>Files below 100 %</summary>', '', `| File | ${METRICS.join(' | ')} |`);
    lines.push(`|---|${METRICS.map(() => '---:').join('|')}|`, ...partial.map(([path, data]) => row(`\`${path}\``, data)));
    lines.push('', '</details>');
  }
  return `${lines.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('..', import.meta.url));
  const path = new URL('../coverage/coverage-summary.json', import.meta.url);
  if (!existsSync(path)) {
    console.log('## Coverage\n\nNo coverage/coverage-summary.json: the test step did not get far enough to write it.');
    process.exit(0);
  }
  process.stdout.write(coverageMarkdown(JSON.parse(readFileSync(path, 'utf8')), root));
}
