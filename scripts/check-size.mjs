#!/usr/bin/env node
/** Spec §2: the core is at most 15 kB gzipped (minified, Angular/rxjs/tslib external). Run after build:lib. */
import { existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { build } from 'esbuild';

const LIMIT = 15 * 1024;
const entry = 'dist/ng-spotlight/fesm2022/tocdk-oss-ng-spotlight.mjs';

if (!existsSync(entry)) {
  console.error(`[check-size] ${entry} not found; run npm run build:lib first`);
  process.exit(1);
}
const result = await build({
  entryPoints: [entry],
  bundle: true,
  minify: true,
  format: 'esm',
  write: false,
  external: ['@angular/*', 'rxjs', 'rxjs/*', 'tslib'],
  logLevel: 'silent',
});
const bytes = gzipSync(result.outputFiles[0].contents, { level: 9 }).length;
console.log(`[check-size] core: ${bytes} bytes (${(bytes / 1024).toFixed(2)} kB) gzipped (limit ${LIMIT} bytes / ${LIMIT / 1024} kB)`);
process.exit(bytes <= LIMIT ? 0 : 1);
