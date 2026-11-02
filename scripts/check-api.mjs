#!/usr/bin/env node
/**
 * API surface guard. Extracts the public API of every entry point of the built package
 * (dist/ng-spotlight, after `npm run build:lib`) and compares it with the committed snapshot in
 * api/. Any change to the published API fails until the snapshot is updated on purpose:
 *
 *   npm run build:lib && npm run check:api -- --update
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { diffLines, extractApi, formatApi } from './check-api-lib.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist/ng-spotlight');
const update = process.argv.includes('--update');

const pkgPath = join(dist, 'package.json');
if (!existsSync(pkgPath)) {
  console.error('[check-api] dist/ng-spotlight/package.json not found; run npm run build:lib first');
  process.exit(1);
}
const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
const entries = Object.entries(pkg.exports ?? {}).filter(([, value]) => typeof value === 'object' && value?.types);
if (entries.length === 0) {
  console.error('[check-api] no entry points with types in dist/ng-spotlight/package.json');
  process.exit(1);
}
// A secondary entry point imports the primary one by package name; resolve it to the build.
const primary = entries.find(([entry]) => entry === '.');
const paths = primary ? { [pkg.name]: [join(dist, primary[1].types)] } : {};

mkdirSync(join(root, 'api'), { recursive: true });
let failed = 0;
for (const [entry, value] of entries) {
  const file = `api/${entry === '.' ? 'ng-spotlight' : `ng-spotlight-${entry.replace(/^\.\//, '').replace(/\//g, '-')}`}.api.md`;
  const actual = formatApi(pkg.name, entry, extractApi(join(dist, value.types), paths));
  const target = join(root, file);
  if (update) {
    writeFileSync(target, actual);
    console.log(`[check-api] wrote ${file}`);
    continue;
  }
  const expected = existsSync(target) ? readFileSync(target, 'utf8') : '';
  if (expected === actual) {
    console.log(`[check-api] ${entry}: matches ${file}`);
    continue;
  }
  failed++;
  console.error(`[check-api] ${entry}: the public API differs from ${file}:`);
  for (const line of diffLines(expected, actual)) console.error(`  ${line}`);
}
if (failed > 0) {
  console.error('\n[check-api] If the change is intended, run `npm run check:api -- --update` and commit api/.');
  process.exit(1);
}
