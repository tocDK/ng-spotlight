import { describe, expect, it } from 'vitest';
import { coverageMarkdown } from './coverage-summary.mjs';

const m = (total, covered) => ({ total, covered, skipped: 0, pct: total === 0 ? 100 : (covered / total) * 100 });
const full = { statements: m(10, 10), branches: m(4, 4), functions: m(2, 2), lines: m(10, 10) };
const partial = { statements: m(10, 9), branches: m(4, 2), functions: m(2, 2), lines: m(10, 10) };

describe('coverage-summary', () => {
  it('prints totals, both entry points and the files below 100 %', () => {
    const md = coverageMarkdown(
      {
        total: { statements: m(20, 19), branches: m(8, 6), functions: m(4, 4), lines: m(20, 20) },
        '/repo/projects/ng-spotlight/src/lib/a.ts': partial,
        '/repo/projects/ng-spotlight/primeng/src/b.ts': full,
      },
      '/repo',
    );
    expect(md).toContain('| **All files** | 95.00 % | 75.00 % | 100.00 % | 100.00 % |');
    expect(md).toContain('| Core (`.`) | 90.00 % | 50.00 % | 100.00 % | 100.00 % |');
    expect(md).toContain('| PrimeNG (`./primeng`) | 100.00 % | 100.00 % | 100.00 % | 100.00 % |');
    expect(md).toContain('| `projects/ng-spotlight/src/lib/a.ts` | 90.00 %');
    expect(md).not.toContain('`projects/ng-spotlight/primeng/src/b.ts`');
  });

  it('leaves out the details block when every file is fully covered', () => {
    const md = coverageMarkdown({ total: full, '/r/projects/ng-spotlight/primeng/src/b.ts': full }, '/r');
    expect(md).not.toContain('<details>');
    expect(md).not.toContain('Core (`.`) |');
  });

  it('counts a metric with nothing to cover as 100 %', () => {
    const empty = { statements: m(0, 0), branches: m(0, 0), functions: m(0, 0), lines: m(0, 0) };
    expect(coverageMarkdown({ total: empty }, '/r')).toContain('| **All files** | 100.00 % | 100.00 % | 100.00 % | 100.00 % |');
  });
});
