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
      thresholds: { lines: 90, branches: 85, functions: 90, statements: 90 },
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
