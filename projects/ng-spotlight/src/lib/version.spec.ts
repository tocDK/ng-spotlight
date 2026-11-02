import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { VERSION } from './version';

describe('VERSION', () => {
  it('matches the version in the library package.json', () => {
    const pkg = JSON.parse(
      readFileSync(resolve(process.cwd(), 'projects/ng-spotlight/package.json'), 'utf8'),
    ) as { version: string };
    expect(VERSION.full).toBe(pkg.version);
  });
});
