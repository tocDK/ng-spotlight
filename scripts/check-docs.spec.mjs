import { describe, expect, it } from 'vitest';
import { extractExports, mentions } from './check-docs-lib.mjs';

const API = `
export { provideSpotlight, type SpotlightRow as Row } from './a';
export type { SpotlightRowContext } from './b';
export const VERSION = '1';
// export { Commented } from './c';
`;

describe('check-docs', () => {
  it('extracts brace, aliased and declaration exports and ignores comments', () => {
    expect(extractExports(API).sort()).toEqual(['Row', 'SpotlightRowContext', 'VERSION', 'provideSpotlight']);
  });

  it('flags a new name that no content mentions', () => {
    expect(mentions('`provideSpotlight` and `VERSION`', 'BrandNewThing')).toBe(false);
  });

  it('does not accept a name that only appears as a prefix or suffix of another', () => {
    expect(mentions('`SpotlightRowContext`', 'SpotlightRow')).toBe(false);
    expect(mentions('`XSpotlightRow`', 'SpotlightRow')).toBe(false);
    expect(mentions('`SpotlightRow`, `SpotlightRowContext`', 'SpotlightRow')).toBe(true);
  });

  it('matches names containing $ literally', () => {
    expect(mentions('uses `$inject`', '$inject')).toBe(true);
  });

  it('fails loudly on export *', () => {
    expect(() => extractExports(`export * from './x';`)).toThrow(/export \*/);
    expect(() => extractExports(`export * as ns from './x';`)).toThrow(/export \*/);
    expect(() => extractExports(`export type * from './x';`)).toThrow(/export \*/);
  });
});
