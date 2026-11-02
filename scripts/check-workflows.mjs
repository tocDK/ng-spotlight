#!/usr/bin/env node
/**
 * Workflow hygiene (spec §8, the zizmor findings on lingui-angular): every action pinned to a
 * commit SHA with a version comment, checkout with persist-credentials: false, a top-level
 * permissions block (exactly `{}`) plus permissions on every job, no write-all/read-all, and no ${{ }}
 * expansion inside run:.
 *
 * Not scanned: plain (non-block) multi-line `run:` scalars and flow-style steps.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const indentOf = (line) => line.search(/\S/);

export function checkWorkflow(text, file = 'workflow.yml') {
  const problems = [];
  const lines = text.split('\n');

  lines.forEach((line, i) => {
    const m = /^\s*(?:-\s+)?uses:\s*([^\s#]+)\s*(#.*)?$/.exec(line);
    if (!m || m[1].startsWith('./')) return;
    if (!/^[\w.-]+\/[\w./-]+@[0-9a-f]{40}$/.test(m[1])) {
      problems.push(`${file}:${i + 1}: action not pinned to a commit SHA: ${m[1]}`);
    } else if (!m[2] || !/^#\s*v\d+(\.\d+)*/.test(m[2])) {
      problems.push(`${file}:${i + 1}: add a "# vX.Y.Z" comment after the pinned SHA`);
    }
  });

  lines.forEach((line, i) => {
    if (!/uses:\s*actions\/checkout@/.test(line)) return;
    const stepIndent = line.trimStart().startsWith('-') ? indentOf(line) : indentOf(line) - 2;
    let ok = false;
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].trim() === '') continue;
      if (indentOf(lines[j]) <= stepIndent) break;
      if (/^\s*persist-credentials:\s*false\s*$/.test(lines[j])) ok = true;
    }
    if (!ok) problems.push(`${file}:${i + 1}: actions/checkout needs "with: persist-credentials: false"`);
  });

  const top = lines.find((l) => /^permissions:/.test(l));
  if (!top) problems.push(`${file}: missing top-level "permissions:"`);
  else if (!/^permissions:\s*\{\}\s*(#.*)?$/.test(top)) problems.push(`${file}: top-level "permissions:" must be {}`);
  lines.forEach((line, i) => {
    if (/^\s*permissions:\s*(write-all|read-all)\b/.test(line)) {
      problems.push(`${file}:${i + 1}: "permissions: ${/write-all/.test(line) ? 'write-all' : 'read-all'}" is not least-privilege`);
    }
  });
  const jobsAt = lines.findIndex((l) => /^jobs:\s*$/.test(l));
  if (jobsAt === -1) {
    problems.push(`${file}: no "jobs:" block`);
  } else {
    const starts = [];
    for (let i = jobsAt + 1; i < lines.length; i++) {
      if (/^\S/.test(lines[i])) break;
      if (/^ {2}[A-Za-z0-9_-]+:\s*(#.*)?$/.test(lines[i])) starts.push(i);
    }
    if (starts.length === 0) problems.push(`${file}: no jobs detected under "jobs:" (jobs must be indented 2 spaces)`);
    starts.forEach((start, k) => {
      const end = k + 1 < starts.length ? starts[k + 1] : lines.length;
      if (!lines.slice(start + 1, end).some((l) => /^ {4}permissions:/.test(l))) {
        problems.push(`${file}:${start + 1}: job "${lines[start].trim().replace(/:\s*(#.*)?$/, '')}" has no "permissions:"`);
      }
    });
  }

  const expansion = '"${{ }}" expansion inside run:; pass it through env: instead';
  for (let i = 0; i < lines.length; i++) {
    const m = /^\s*(?:-\s+)?run:\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const runIndent = indentOf(lines[i]) + (lines[i].trimStart().startsWith('-') ? 2 : 0);
    if (m[1].includes('${{')) problems.push(`${file}:${i + 1}: ${expansion}`);
    if (/^[|>]/.test(m[1].trim())) {
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() === '') continue;
        if (indentOf(lines[j]) <= runIndent) break;
        if (lines[j].includes('${{')) problems.push(`${file}:${j + 1}: ${expansion}`);
      }
    }
  }
  return problems;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = join(fileURLToPath(new URL('..', import.meta.url)), '.github/workflows');
  const files = readdirSync(dir).filter((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  if (files.length === 0) {
    console.error('[check-workflows] FAIL: no workflow files');
    process.exit(1);
  }
  const problems = files.flatMap((f) => checkWorkflow(readFileSync(join(dir, f), 'utf8'), `.github/workflows/${f}`));
  for (const p of problems) console.error(`  FAIL  ${p}`);
  console.log(`[check-workflows] ${files.length} file(s), ${problems.length} problem(s)`);
  process.exit(problems.length === 0 ? 0 : 1);
}
