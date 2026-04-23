import { fileURLToPath } from 'node:url';
import path from 'node:path';
import boundaries from 'eslint-plugin-boundaries';
import tsParser from '@typescript-eslint/parser';
import tsPlugin from '@typescript-eslint/eslint-plugin';

const repoRoot = path.dirname(fileURLToPath(import.meta.url));

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
      'import/resolver': {
        typescript: { alwaysTryTypes: true },
        node: true,
      },
      'boundaries/root-path': repoRoot,
      'boundaries/include': [
        'packages/**/*.{ts,tsx}',
        'apps/**/*.{ts,tsx}',
        'games/**/*.{ts,tsx}',
      ],
      'boundaries/elements': [
        { type: 'core', pattern: 'packages/2d-core/**', mode: 'full' },
        { type: 'genre', pattern: 'packages/2d-*-core/**', mode: 'full' },
        { type: 'plugin', pattern: 'packages/economy-*/**', mode: 'full' },
        { type: 'content', pattern: 'packages/content-*/**', mode: 'full' },
        { type: 'registry', pattern: 'packages/registry/**', mode: 'full' },
        { type: 'game', pattern: 'games/*/**', mode: 'full' },
        { type: 'app', pattern: 'apps/*/**', mode: 'full' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'core', allow: ['core'] },
            { from: 'genre', allow: ['core', 'genre'] },
            { from: 'plugin', allow: ['core', 'plugin'] },
            { from: 'content', allow: ['core', 'genre', 'content'] },
            { from: 'registry', allow: ['core'] },
            { from: 'game', allow: ['core', 'genre', 'plugin', 'content', 'game', 'registry'] },
            { from: 'app', allow: ['core', 'genre', 'plugin', 'content', 'game', 'app'] },
          ],
        },
      ],
    },
  },
];
