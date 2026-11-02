#!/usr/bin/env node
/**
 * Drift guard for the kitchen sink: every export of both entry points
 * (projects/ng-spotlight/src/public-api.ts and projects/ng-spotlight/primeng/src/public-api.ts)
 * must be mentioned in at least one projects/kitchen-sink/src/app/content/*.content.ts file.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractExports, mentions } from './check-docs-lib.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const entryPoints = ['projects/ng-spotlight/src/public-api.ts', 'projects/ng-spotlight/primeng/src/public-api.ts'];
const contentDir = join(root, 'projects/kitchen-sink/src/app/content');

if (!existsSync(contentDir)) {
  console.error(`[check-docs] FAIL: ${contentDir} does not exist`);
  process.exit(1);
}
const contents = readdirSync(contentDir)
  .filter((f) => f.endsWith('.content.ts'))
  .map((f) => readFileSync(join(contentDir, f), 'utf8'));
if (contents.length === 0) {
  console.error('[check-docs] FAIL: no *.content.ts files');
  process.exit(1);
}

let failures = 0;
let checked = 0;
for (const entry of entryPoints) {
  const path = join(root, entry);
  if (!existsSync(path)) {
    console.error(`[check-docs] FAIL: ${entry} not found`);
    process.exit(1);
  }
  let names;
  try {
    names = extractExports(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`[check-docs] FAIL: ${entry}: ${err.message}`);
    process.exit(1);
  }
  for (const name of names) {
    checked++;
    if (contents.some((c) => mentions(c, name))) {
      console.log(`  PASS  ${name}`);
    } else {
      console.log(`  FAIL  ${name} (${entry}) is not mentioned in any content/*.content.ts`);
      failures++;
    }
  }
}
console.log(`\n[check-docs] ${checked - failures} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
