import boundaries from 'eslint-plugin-boundaries';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    ignores: [
      '**/node_modules/**',
      '**/.next/**',
      '**/out/**',
      '**/dist/**',
      '**/.turbo/**',
      '**/coverage/**',
      '**/playwright-report/**',
      '**/test-results/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module' },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      boundaries,
    },
    settings: {
      'boundaries/elements': [
        { type: 'core', pattern: 'packages/2d-core/**' },
        { type: 'genre', pattern: 'packages/2d-*-core/**' },
        { type: 'plugin', pattern: 'packages/economy-*/**' },
        { type: 'content', pattern: 'packages/content-*/**' },
        { type: 'game', pattern: 'games/*/**' },
        { type: 'app', pattern: 'apps/*/**' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'core', allow: [] },
            { from: 'genre', allow: ['core'] },
            { from: 'plugin', allow: ['core'] },
            { from: 'content', allow: ['core', 'genre'] },
            { from: 'game', allow: ['core', 'genre', 'plugin', 'content'] },
            { from: 'app', allow: ['core', 'genre', 'plugin', 'content', 'game'] },
          ],
        },
      ],
    },
  },
];
