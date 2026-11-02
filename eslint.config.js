// @ts-check
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const angularEslint = require('angular-eslint');

module.exports = [
  {
    ignores: ['dist/', 'out-tsc/', 'node_modules/', 'coverage/', '**/sources.generated.ts'],
  },
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tseslint,
      '@angular-eslint': angularEslint.tsPlugin,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: { project: ['tsconfig.base.json'] },
    },
    rules: {
      ...tseslint.configs['recommended-type-checked'].rules,
      ...angularEslint.configs.tsRecommended.reduce((acc, cfg) => ({ ...acc, ...(cfg.rules ?? {}) }), {}),
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@angular-eslint/directive-selector': [
        'error',
        { type: 'attribute', prefix: ['spotlight', 'app'], style: 'camelCase' },
      ],
      '@angular-eslint/component-selector': [
        'error',
        { type: 'element', prefix: ['spotlight', 'app'], style: 'kebab-case' },
      ],
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.spec-util.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  {
    files: ['**/*.html'],
    plugins: { '@angular-eslint/template': angularEslint.templatePlugin },
    languageOptions: { parser: angularEslint.templateParser },
    rules: {
      ...angularEslint.configs.templateRecommended.reduce((acc, cfg) => ({ ...acc, ...(cfg.rules ?? {}) }), {}),
    },
  },
];
