import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { diffLines, extractApi, formatApi } from './check-api-lib.mjs';

const DTS = `
import * as i0 from '@angular/core';

interface Hidden { a: string }

/** Docs are not part of the snapshot. */
declare class Palette {
  private secret;
  readonly open: () => void;
  readonly state: i0.Signal<string>;
  protected helper(): void;
  get hidden(): Hidden;
  static ɵfac: i0.ɵɵFactoryDeclaration<Palette, never>;
  static ɵcmp: i0.ɵɵComponentDeclaration<Palette, "x-palette", never, { "ctx": { "alias": "ctx"; "required": true; }; }, {}, never, never, true, never>;
}
interface Options<T = string> extends Base { value: T; }
interface Base { id: string }
declare function make(x: number): Palette;
declare const KEY: string;
type Tone = 'a' | 'b';

export { Palette, make, KEY as RENAMED };
export type { Options, Base, Tone };
`;

const dir = mkdtempSync(join(tmpdir(), 'check-api-'));
const file = join(dir, 'fixture.d.ts');
writeFileSync(file, DTS);
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe('check-api', () => {
  const api = extractApi(file);

  it('lists every export, sorted, with public and protected members only', () => {
    expect(api.lines).toEqual([
      'interface Base {',
      '  id: string',
      '}',
      '',
      'function make(x: number): Palette;',
      '',
      'interface Options<T = string> extends Base {',
      '  value: T;',
      '}',
      '',
      'class Palette {',
      '  readonly open: () => void;',
      "  readonly state: import('@angular/core').Signal<string>;",
      '  protected helper(): void;',
      '  get hidden(): Hidden;',
      '  // @component selector="x-palette" exportAs=never inputs={ "ctx": { "alias": "ctx"; "required": true; }; } outputs={}',
      '}',
      '',
      'const KEY: string; /* exported as RENAMED */',
      '',
      "type Tone = 'a' | 'b';",
      '',
    ]);
  });

  it('reports non-exported declarations that the public API drags into the bundle', () => {
    expect(api.internal).toEqual(['Hidden']);
  });

  it('formats a snapshot per entry point', () => {
    const text = formatApi('@x/pkg', './primeng', api);
    expect(text).toContain('# Public API: @x/pkg/primeng');
    expect(text).toContain('- `Hidden`');
    expect(formatApi('@x/pkg', '.', { lines: [], internal: [] })).toContain('# Public API: @x/pkg\n');
    expect(formatApi('@x/pkg', '.', { lines: [], internal: [] })).toContain('(none)');
  });

  it('diffs removed and added lines', () => {
    expect(diffLines('a\nb\nc', 'a\nc\nd')).toEqual(['- b', '+ d']);
  });

  it('fails on a file that is not a module', () => {
    const script = join(dir, 'script.d.ts');
    writeFileSync(script, 'declare const x: number;\n');
    expect(() => extractApi(script)).toThrow('is not a module');
    expect(() => extractApi(join(dir, 'missing.d.ts'))).toThrow('cannot read');
  });
});
