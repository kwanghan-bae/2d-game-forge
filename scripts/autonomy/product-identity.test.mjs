import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';

const ROOT = join(import.meta.dirname, '..', '..');
const SOURCE_ROOT = join(ROOT, 'games', 'inflation-rpg', 'src');
const CURRENT_ROOT = join(SOURCE_ROOT, 'village');
const LEGACY_CURRENT_ROOT = join(SOURCE_ROOT, 'v4');
const ENTRYPOINTS = ['startGame.ts', 'index.ts', 'types.ts'];

function walkFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

function stripIdentifiers(text) {
  return text
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, '');
}

function findIdentityViolations() {
  const files = [
    ...walkFiles(CURRENT_ROOT),
    ...ENTRYPOINTS.map((file) => join(SOURCE_ROOT, file)).filter(existsSync),
  ];
  const violations = [];

  if (existsSync(LEGACY_CURRENT_ROOT)) {
    violations.push(`obsolete current-product source path: ${relative(ROOT, LEGACY_CURRENT_ROOT)}`);
    files.push(...walkFiles(LEGACY_CURRENT_ROOT));
  }
  if (!existsSync(CURRENT_ROOT)) {
    violations.push(`missing current-product source path: ${relative(ROOT, CURRENT_ROOT)}`);
  }

  for (const file of files) {
    const relativePath = relative(ROOT, file).split(sep).join('/');
    if (/(^|\/)v4(?:\/|$)|(?:^|\/)(?:V4|v4)[^/]*\./.test(relativePath)) {
      violations.push(`${relativePath}: current-product path uses v4/V4`);
    }

    if (file.endsWith('legacyCompatibility.ts')) continue;

    const source = readFileSync(file, 'utf8');
    const identifiers = stripIdentifiers(source);
    const identityPattern = /\b(?:V4[A-Za-z0-9_]+|useV4[A-Za-z0-9_]*|v4[A-Z][A-Za-z0-9_]*)\b/g;
    for (const match of identifiers.matchAll(identityPattern)) {
      violations.push(`${relativePath}: current-product identifier ${match[0]}`);
    }

    for (const match of source.matchAll(/(?:data-testid|className|class|--)(?:\s*[:=]\s*|\s+)[^\n'"`]*/g)) {
      if (/\bv4-/.test(match[0])) {
        violations.push(`${relativePath}: current-product CSS/test id ${match[0].trim()}`);
      }
    }
  }

  return [...new Set(violations)];
}

test('current-product runtime uses the village namespace', () => {
  const violations = findIdentityViolations();
  assert.deepEqual(violations, [], `identity violations:\n${violations.join('\n')}`);
});
