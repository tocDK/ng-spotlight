#!/usr/bin/env node
/**
 * Drift guard for the kitchen sink: every export of both entry points
 * (projects/ng-spotlight/src/public-api.ts and projects/ng-spotlight/primeng/src/public-api.ts)
 * must be mentioned in at least one projects/kitchen-sink/src/app/content/*.content.ts file.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const entryPoints = ['projects/ng-spotlight/src/public-api.ts', 'projects/ng-spotlight/primeng/src/public-api.ts'];
const contentDir = join(root, 'projects/kitchen-sink/src/app/content');

function extractExports(source) {
  const names = new Set();
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  const braceRe = /export\s+(?:type\s+)?\{([^}]+)\}/g;
  let match;
  while ((match = braceRe.exec(stripped)) !== null) {
    for (const raw of match[1].split(',')) {
      let name = raw.trim();
      if (!name) continue;
      if (name.startsWith('type ')) name = name.slice(5).trim();
      const asIndex = name.indexOf(' as ');
      if (asIndex > 0) name = name.slice(asIndex + 4).trim();
      if (name) names.add(name);
    }
  }
  const declRe = /export\s+(?:declare\s+)?(?:abstract\s+)?(?:class|function|const|let|var|interface|type|enum)\s+([A-Za-z_$][\w$]*)/g;
  while ((match = declRe.exec(stripped)) !== null) names.add(match[1]);
  return [...names];
}

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
  for (const name of extractExports(readFileSync(path, 'utf8'))) {
    checked++;
    if (contents.some((c) => c.includes(name))) {
      console.log(`  PASS  ${name}`);
    } else {
      console.log(`  FAIL  ${name} (${entry}) is not mentioned in any content/*.content.ts`);
      failures++;
    }
  }
}
console.log(`\n[check-docs] ${checked - failures} passed, ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
