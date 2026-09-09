import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { test } from 'node:test';

const ROOT = join(import.meta.dirname, '..', '..');
const SOURCE_ROOT = join(ROOT, 'games', 'inflation-rpg', 'src');
const CURRENT_ROOT = join(SOURCE_ROOT, 'village');
const LEGACY_CURRENT_ROOT = join(SOURCE_ROOT, 'v4');
const ENTRYPOINTS = ['startGame.ts', 'index.ts', 'types.ts'];
const CORE_DOCUMENTS = [
  'AGENTS.md',
  'CLAUDE.md',
  'README.md',
  'docs/README.md',
  'docs/PRODUCT.md',
  'docs/BACKLOG.md',
  'docs/작업-현황.md',
  'docs/OPERATIONS.md',
  'docs/DECISIONS.md',
  'docs/ARCHITECTURE.md',
  'docs/CONTRIBUTING.md',
  'docs/CREDITS.md',
  'games/inflation-rpg/README.md',
  'docs/privacy-policy/ko/index.html',
  'games/inflation-rpg/public/privacy-policy.html',
];
const HISTORICAL_PREFIXES = ['docs/superpowers/', 'docs/archive/', 'docs/personas/', '.claude/agents/'];
const REQUIRED_CURRENT_FACTS = [
  '6be98aad',
  '34317655778',
  '34317655047',
  '402개 파일·3,703개 테스트',
];

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

function findSourceIdentityViolations(relativePath, source) {
  const violations = [];
  const identifiers = stripIdentifiers(source);
  const identityPattern = /\b(?:V4[A-Za-z0-9_]*|useV4[A-Za-z0-9_]*|v4[A-Z][A-Za-z0-9_]*)\b/g;
  for (const match of identifiers.matchAll(identityPattern)) {
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

function trackedFiles() {
  return execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean);
}

function currentTrackedFiles() {
  return trackedFiles().filter((path) => existsSync(join(ROOT, path)));
}

function findDocumentationViolations() {
  const violations = [];
  const canonicalText = CORE_DOCUMENTS.map((path) => {
    const absolutePath = join(ROOT, path);
    return { path, source: existsSync(absolutePath) ? readFileSync(absolutePath, 'utf8') : '' };
  });

  for (const { path, source } of canonicalText) {
    if (!source) {
      violations.push(`${path}: missing canonical document`);
      continue;
    }

    for (const [lineNumber, line] of source.split('\n').entries()) {
      if (/\bV4\b|\bv4(?:[-_]|\b)/.test(line) && !/(호환|격리|legacy|레거시|이전|저장 키|appId|alias)/i.test(line)) {
        violations.push(`${path}:${lineNumber + 1}: current-product generation label remains`);
      }
      if (/아직 push하지 않았|GitHub Actions 결과가 없다|원격 실행은 push 전이라 미측정|CI.*미검증/i.test(line)) {
        violations.push(`${path}:${lineNumber + 1}: stale CI verification claim remains`);
      }
      for (const prefix of HISTORICAL_PREFIXES) {
        if (line.includes(prefix)) violations.push(`${path}:${lineNumber + 1}: deleted historical path remains: ${prefix}`);
      }
    }
  }

  const statusFiles = currentTrackedFiles().filter((path) => /^STATUS-[^/]+\.md$/.test(path));
  for (const path of statusFiles) violations.push(`tracked root status file remains: ${path}`);

  for (const prefix of HISTORICAL_PREFIXES) {
    for (const path of currentTrackedFiles()) {
      if (path.startsWith(prefix)) violations.push(`tracked historical file remains: ${path}`);
    }
  }

  const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf8');
  for (const entry of ['/output/', '/tmp/']) {
    if (!gitignore.split('\n').includes(entry)) violations.push(`.gitignore is missing ${entry}`);
  }

  for (const fact of REQUIRED_CURRENT_FACTS) {
    if (!readFileSync(join(ROOT, 'docs/작업-현황.md'), 'utf8').includes(fact)) {
      violations.push(`docs/작업-현황.md: missing required current fact ${fact}`);
    }
  }

  const deletedPathReferences = HISTORICAL_PREFIXES.map((prefix) => prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const referencePattern = new RegExp(`(?:${deletedPathReferences})`);
  for (const path of currentTrackedFiles()) {
    if (path === 'scripts/autonomy/product-identity.test.mjs' || HISTORICAL_PREFIXES.some((prefix) => path.startsWith(prefix))) continue;
    if (/^(?:output|tmp)(?:\/|$)/.test(path)) continue;
    if (!/\.(?:md|html|mjs|ts|tsx|js|jsx|json)$/.test(path)) continue;
    const source = readFileSync(join(ROOT, path), 'utf8');
    if (referencePattern.test(source)) violations.push(`${path}: stale deleted-document reference remains`);
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

test('scanner rejects exact V4 player-facing JSX text', () => {
  const violations = findSourceIdentityViolations(
    'games/inflation-rpg/src/village/scanner-jsx-text-fixture.tsx',
    'export function Fixture() { return <div>V4</div>; }',
  );
  assert.ok(violations.some((violation) => violation.includes('identifier V4')), 'expected exact V4 JSX text violation');
});

test('canonical documents preserve current facts and isolate historical material', () => {
  const violations = findDocumentationViolations();
  assert.deepEqual(violations, [], `documentation identity violations:\n${violations.join('\n')}`);
});
