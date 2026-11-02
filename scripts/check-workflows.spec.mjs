import { checkWorkflow } from './check-workflows.mjs';

const SHA = '3d3c42e5aac5ba805825da76410c181273ba90b1';
const EXPR = '$' + '{{ github.ref_name }}';

const good = [
  'name: ok',
  'on: push',
  'permissions: {}',
  'jobs:',
  '  build:',
  '    runs-on: ubuntu-latest',
  '    permissions:',
  '      contents: read',
  '    steps:',
  `      - uses: actions/checkout@${SHA} # v7.0.1`,
  '        with:',
  '          persist-credentials: false',
  '      - name: Use an env var',
  '        run: echo "$REF"',
  '        env:',
  `          REF: ${EXPR}`,
].join('\n');

describe('checkWorkflow', () => {
  it('accepts a hardened workflow', () => {
    expect(checkWorkflow(good, 'good.yml')).toEqual([]);
  });

  it('flags actions pinned to a tag and SHAs without a version comment', () => {
    const tagPinned = good.replace(`actions/checkout@${SHA} # v7.0.1`, 'actions/checkout@v4');
    expect(checkWorkflow(tagPinned, 'w.yml')).toEqual(['w.yml:10: action not pinned to a commit SHA: actions/checkout@v4']);
    const noComment = good.replace(' # v7.0.1', '');
    expect(checkWorkflow(noComment, 'w.yml')).toEqual(['w.yml:10: add a "# vX.Y.Z" comment after the pinned SHA']);
  });

  it('flags a checkout that persists credentials', () => {
    const persisted = good.replace('          persist-credentials: false', '          fetch-depth: 0');
    expect(checkWorkflow(persisted, 'w.yml')).toEqual(['w.yml:10: actions/checkout needs "with: persist-credentials: false"']);
  });

  it('flags missing top-level and job permissions', () => {
    const noTop = good.replace('permissions: {}\n', '');
    expect(checkWorkflow(noTop, 'w.yml')).toEqual(['w.yml: missing top-level "permissions:"']);
    const noJob = good.replace('    permissions:\n      contents: read\n', '');
    expect(checkWorkflow(noJob, 'w.yml')).toEqual(['w.yml:5: job "build" has no "permissions:"']);
  });

  it('flags ${{ }} expansion inside run, inline and in a block', () => {
    const inline = good.replace('        run: echo "$REF"', `        run: echo "${EXPR}"`);
    expect(checkWorkflow(inline, 'w.yml')).toEqual(['w.yml:14: "${{ }}" expansion inside run:; pass it through env: instead']);
    const block = good.replace('        run: echo "$REF"', `        run: |\n          echo start\n          echo "${EXPR}"`);
    expect(checkWorkflow(block, 'w.yml')).toEqual(['w.yml:16: "${{ }}" expansion inside run:; pass it through env: instead']);
  });

  it('requires the top-level permissions to be {} and rejects write-all/read-all', () => {
    const open = good.replace('permissions: {}', 'permissions:\n  contents: read');
    expect(checkWorkflow(open, 'w.yml')).toEqual(['w.yml: top-level "permissions:" must be {}']);
    const writeAll = good.replace('    permissions:\n      contents: read', '    permissions: write-all');
    expect(checkWorkflow(writeAll, 'w.yml')).toEqual(['w.yml:7: "permissions: write-all" is not least-privilege']);
    const readAll = good.replace('permissions: {}', 'permissions: read-all');
    expect(checkWorkflow(readAll, 'w.yml')).toEqual([
      'w.yml: top-level "permissions:" must be {}',
      'w.yml:3: "permissions: read-all" is not least-privilege',
    ]);
  });

  it('detects a job header that carries a trailing comment', () => {
    const commented = good.replace('  build:', '  build: # main job').replace('    permissions:\n      contents: read\n', '');
    expect(checkWorkflow(commented, 'w.yml')).toEqual(['w.yml:5: job "build" has no "permissions:"']);
  });

  it('fails when no job is detected (wrong indentation)', () => {
    const indented = good
      .split('\n')
      .map((l, i) => (i >= 4 ? `  ${l}` : l))
      .join('\n');
    expect(checkWorkflow(indented, 'w.yml')).toContain('w.yml: no jobs detected under "jobs:" (jobs must be indented 2 spaces)');
  });

  it('rejects a bare or non-version comment after a pinned SHA', () => {
    const bare = good.replace('# v7.0.1', '#');
    expect(checkWorkflow(bare, 'w.yml')).toEqual(['w.yml:10: add a "# vX.Y.Z" comment after the pinned SHA']);
    const nonVersion = good.replace('# v7.0.1', '# latest');
    expect(checkWorkflow(nonVersion, 'w.yml')).toEqual(['w.yml:10: add a "# vX.Y.Z" comment after the pinned SHA']);
  });
});
