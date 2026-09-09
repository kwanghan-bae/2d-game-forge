import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
    .replace(/\/\/.*$/gm, (match) => ' '.repeat(match.length))
    .replace(/\/\*[\s\S]*?\*\//g, (match) => ' '.repeat(match.length))
    .replace(/(['"`])(?:\\.|(?!\1)[^\\])*\1/g, (match) => ' '.repeat(match.length));
}

function isJsxTextToken(source, index) {
  const lastOpen = source.lastIndexOf('<', index);
  const lastClose = source.lastIndexOf('>', index);
  if (lastClose <= lastOpen) return false;
  const nextOpen = source.indexOf('<', index);
  return nextOpen !== -1 && !source.slice(lastClose + 1, index).includes('{');
}

function findSourceIdentityViolations(relativePath, source) {
  const violations = [];
  const identifiers = stripIdentifiers(source);
  const identityPattern = /\b(?:V4[A-Za-z0-9_]*|useV4[A-Za-z0-9_]*|v4[A-Z][A-Za-z0-9_]*)\b/g;
  for (const match of identifiers.matchAll(identityPattern)) {
    if (match[0] === 'V4' && isJsxTextToken(source, match.index)) continue;
    violations.push(`${relativePath}: current-product identifier ${match[0]}`);
  }

  const sourceWithoutCompatibilityValues = source.replace(
    /shin-ui-eternal-sponsor-v4-(?:save|metrics|rewarded-usage)-v1/g,
    '',
  );
  for (const match of sourceWithoutCompatibilityValues.matchAll(/\bv4-[A-Za-z0-9_-]+/g)) {
    violations.push(`${relativePath}: current-product CSS/test id or token ${match[0]}`);
  }

  return violations;
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
    violations.push(...findSourceIdentityViolations(relativePath, source));
  }

  return [...new Set(violations)];
}

test('current-product runtime uses the village namespace', () => {
  const violations = findIdentityViolations();
  assert.deepEqual(violations, [], `identity violations:\n${violations.join('\n')}`);
});

test('scanner rejects JSX identity strings and exact V4 identifiers', () => {
  const violations = findSourceIdentityViolations(
    'games/inflation-rpg/src/village/scanner-fixture.tsx',
    `export const V4 = 'temporary fixture';
     export function Fixture() {
       return <div className="v4-shell" data-testid="v4-app" />;
     }`,
  );
  assert.ok(violations.some((violation) => violation.includes('v4-shell')), 'expected v4-shell violation');
  assert.ok(violations.some((violation) => violation.includes('v4-app')), 'expected v4-app violation');
  assert.ok(violations.some((violation) => violation.includes('identifier V4')), 'expected exact V4 identifier violation');
});
