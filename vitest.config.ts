import { fileURLToPath } from 'node:url';
import angular from '@analogjs/vite-plugin-angular';
import { defineConfig } from 'vitest/config';

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  plugins: [angular({ tsconfig: './tsconfig.spec.json' })],
  resolve: {
    // Vite does not read tsconfig "paths"; mirror them here. The more specific alias goes first.
    alias: [
      {
        find: /^@tocdk\/ng-spotlight\/primeng$/,
        replacement: fromRoot('./projects/ng-spotlight/primeng/src/public-api.ts'),
      },
      { find: /^@tocdk\/ng-spotlight$/, replacement: fromRoot('./projects/ng-spotlight/src/public-api.ts') },
    ],
  },
  test: {
    globals: true,
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      include: ['projects/ng-spotlight/src/lib/**/*.ts', 'projects/ng-spotlight/primeng/src/**/*.ts'],
      exclude: ['**/*.spec.ts', '**/*.spec-util.ts', '**/public-api.ts', '**/index.ts'],
      reporter: ['text', 'html', 'json-summary', 'json'],
      // Just below the actual numbers (21.0.0: 98.5 / 96.2 / 99.1 / 99.6), so a change that drops coverage fails
      // CI. Raise them when coverage goes up. The /primeng entry point is held to the same bar on its own, so the
      // core's numbers cannot hide an untested adapter.
      thresholds: {
        statements: 98,
        branches: 95,
        functions: 98,
        lines: 99,
        'projects/ng-spotlight/primeng/src/**/*.ts': { statements: 98, branches: 95, functions: 98, lines: 99 },
      },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'lib',
          environment: 'jsdom',
          include: ['projects/ng-spotlight/**/*.spec.ts'],
          // setupFiles must be explicit per project (not reliably inherited with the Angular
          // plugin), and must be .js so the Angular transform does not swallow it.
          setupFiles: ['./vitest.setup.js'],
        },
      },
      {
        extends: true,
        test: { name: 'tooling', environment: 'node', include: ['scripts/**/*.spec.mjs'] },
      },
      {
        extends: true,
        test: {
          name: 'demo',
          environment: 'jsdom',
          include: ['projects/kitchen-sink/src/**/*.spec.ts'],
          setupFiles: ['./vitest.setup.js'],
        },
      },
    ],
  },
});
