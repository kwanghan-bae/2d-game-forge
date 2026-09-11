import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { test } from 'node:test';

const ROOT = join(import.meta.dirname, '..', '..');
const SOURCE_ROOT = join(ROOT, 'games', 'inflation-rpg', 'src');
const CURRENT_ROOT = join(SOURCE_ROOT, 'village');
const ENTRYPOINTS = ['startGame.ts', 'mountGame.ts', 'index.ts', 'types.ts'];
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
const RETIRED_GENERATIONS = [['V', '3'].join(''), ['V', '4'].join('')];
const RETIRED_IDENTITIES = [
  ...RETIRED_GENERATIONS,
  ['신의 마을: ', '옛 모험'].join(''),
  ['inflation-rpg', '-legacy'].join(''),
  ['korea_', 'inflation_rpg_save'].join(''),
  ['com.korea.', 'inflationrpg'].join(''),
  ['Korea', 'InflationRPG'].join(''),
  ['Start', 'LegacyGame'].join(''),
  ['legacy', 'Compatibility'].join(''),
  ['shin-ui-eternal-sponsor-', 'v4-'].join(''),
];
const REQUIRED_CURRENT_FACTS = [
  '출시 전 현재 게임',
  'com.shinui.eternalsponsor',
  'shin-ui-eternal-sponsor-save-v2',
];

function walkFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walkFiles(path) : [path];
  });
}

function escapedPattern(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findSourceIdentityViolations(relativePath, source) {
  const violations = [];
  const generationPattern = /\bv[34](?:[-_a-z0-9]*)?\b/gi;
  for (const match of source.matchAll(generationPattern)) {
    violations.push(`${relativePath}: retired generation label ${match[0]}`);
  }

  for (const token of RETIRED_IDENTITIES) {
    if (new RegExp(escapedPattern(token), 'i').test(source)) {
      violations.push(`${relativePath}: retired product identity ${token}`);
    }
  }

  if (/\blegacy\b/i.test(source)) {
    violations.push(`${relativePath}: retired compatibility wording remains`);
  }

  return [...new Set(violations)];
}

function findIdentityViolations() {
  const files = [
    ...walkFiles(CURRENT_ROOT),
    ...ENTRYPOINTS.map((file) => join(SOURCE_ROOT, file)).filter(existsSync),
  ];
  const violations = [];

  if (!existsSync(CURRENT_ROOT)) {
    violations.push(`missing current-product source path: ${relative(ROOT, CURRENT_ROOT)}`);
  }

  for (const file of files) {
    const relativePath = relative(ROOT, file).split(sep).join('/');
    if (/(^|\/)v[34](?:\/|$)/i.test(relativePath)) {
      violations.push(`${relativePath}: current-product path uses a retired generation label`);
    }
    violations.push(...findSourceIdentityViolations(relativePath, readFileSync(file, 'utf8')));
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

function findTrackedRootStatusViolations(paths) {
  return paths
    .filter((path) => /^STATUS-[^/]+\.md$/.test(path))
    .map((path) => `tracked root status file remains: ${path}`);
}

function findMarkdownLinkViolations(relativePath, source) {
  const violations = [];
  const markdownLink = /\[[^\]]+\]\(([^)]+)\)/g;
  const documentPath = join(ROOT, relativePath);

  for (const match of source.matchAll(markdownLink)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, '');
    const target = rawTarget.split('#')[0].trim();
    if (!target || rawTarget.startsWith('#') || target.startsWith('/') || /^(?:https?:|mailto:|data:|\/\/)/i.test(target)) continue;

    const targetPath = resolve(dirname(documentPath), target);
    if (!existsSync(targetPath)) violations.push(`${relativePath}: broken relative Markdown link ${rawTarget}`);
  }

  return violations;
}

function findDocumentSourceViolations(relativePath, source) {
  const violations = [];
  for (const match of source.matchAll(/\bSTATUS-[^/\s)`]+\.md\b/g)) {
    violations.push(`${relativePath}: canonical document references ${match[0]}`);
  }
  violations.push(...findMarkdownLinkViolations(relativePath, source));
  return [...new Set(violations)];
}

function documentFixtureViolations(relativePath, source) {
  if (typeof findDocumentSourceViolations !== 'function') return ['document scanner helper is missing'];
  return findDocumentSourceViolations(relativePath, source);
}

function trackedStatusFixtureViolations(paths) {
  if (typeof findTrackedRootStatusViolations !== 'function') return ['tracked status scanner helper is missing'];
  return findTrackedRootStatusViolations(paths);
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

    violations.push(...findSourceIdentityViolations(path, source));
    violations.push(...findDocumentSourceViolations(path, source));

    for (const [lineNumber, line] of source.split('\n').entries()) {
      if (/아직 push하지 않았|GitHub Actions 결과가 없다|원격 실행은 push 전이라 미측정|CI.*미검증/i.test(line)) {
        violations.push(`${path}:${lineNumber + 1}: stale CI verification claim remains`);
      }
      for (const prefix of HISTORICAL_PREFIXES) {
        if (line.includes(prefix)) violations.push(`${path}:${lineNumber + 1}: deleted historical path remains: ${prefix}`);
      }
    }
  }

  violations.push(...findTrackedRootStatusViolations(currentTrackedFiles()));

  for (const prefix of HISTORICAL_PREFIXES) {
    for (const path of currentTrackedFiles()) {
      if (path.startsWith(prefix)) violations.push(`tracked historical file remains: ${path}`);
    }
  }

  const gitignore = readFileSync(join(ROOT, '.gitignore'), 'utf8');
  for (const entry of ['/output/', '/tmp/']) {
    if (!gitignore.split('\n').includes(entry)) violations.push(`.gitignore is missing ${entry}`);
  }

  const status = readFileSync(join(ROOT, 'docs/작업-현황.md'), 'utf8');
  for (const fact of REQUIRED_CURRENT_FACTS) {
    if (!status.includes(fact)) violations.push(`docs/작업-현황.md: missing required current fact ${fact}`);
  }

  const deletedPathReferences = HISTORICAL_PREFIXES.map((prefix) => escapedPattern(prefix)).join('|');
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

test('current runtime uses only the current product surface', () => {
  const violations = findIdentityViolations();
  assert.deepEqual(violations, [], `identity violations:\n${violations.join('\n')}`);
});

test('scanner rejects retired generation labels in JSX and identifiers', () => {
  const retiredGeneration = RETIRED_GENERATIONS[1];
  const retiredLower = retiredGeneration.toLowerCase();
  const violations = findSourceIdentityViolations(
    'games/inflation-rpg/src/village/scanner-fixture.tsx',
    `export const ${retiredGeneration} = 'temporary fixture';
     export function Fixture() {
       return <div className="${retiredLower}-shell" data-testid="${retiredLower}-app" />;
     }`,
  );
  assert.ok(violations.some((violation) => violation.includes(`${retiredLower}-shell`)), 'expected retired shell violation');
  assert.ok(violations.some((violation) => violation.includes(`${retiredLower}-app`)), 'expected retired app violation');
  assert.ok(violations.some((violation) => violation.includes('retired generation label')), 'expected generation violation');
});

test('scanner rejects retired player-facing JSX text and old product identities', () => {
  const retiredGeneration = RETIRED_GENERATIONS[1];
  const retiredProduct = ['신의 마을: ', '옛 모험'].join('');
  const retiredRoute = ['inflation-rpg', '-legacy'].join('');
  const retiredKey = ['korea_', 'inflation_rpg_save'].join('');
  const retiredPackage = ['com.korea.', 'inflationrpg'].join('');
  const violations = findSourceIdentityViolations(
    'games/inflation-rpg/src/village/scanner-jsx-text-fixture.tsx',
    `<div>${retiredGeneration} ${retiredProduct} ${retiredRoute} ${retiredKey} ${retiredPackage}</div>`,
  );
  assert.ok(violations.some((violation) => violation.includes('retired generation label')), 'expected text generation violation');
  assert.ok(violations.some((violation) => violation.includes(retiredProduct)), 'expected old product violation');
  assert.ok(violations.some((violation) => violation.includes(retiredRoute)), 'expected old route violation');
  assert.ok(violations.some((violation) => violation.includes(retiredKey)), 'expected old save key violation');
  assert.ok(violations.some((violation) => violation.includes(retiredPackage)), 'expected old package violation');
});

test('scanner rejects broken relative Markdown links and skips external links', () => {
  const violations = documentFixtureViolations(
    'docs/fixture.md',
    '[broken](missing-target.md) [web](https://example.com) [anchor](#section) [mail](mailto:test@example.com)',
  );
  assert.ok(violations.some((violation) => violation.includes('missing-target.md')), 'expected broken link violation');
  assert.equal(violations.some((violation) => violation.includes('example.com')), false, 'external links must be skipped');
  assert.equal(violations.some((violation) => violation.includes('#section')), false, 'anchors must be skipped');
  assert.equal(violations.some((violation) => violation.includes('mailto:')), false, 'mailto links must be skipped');
});

test('scanner rejects STATUS references in canonical document fixtures', () => {
  const violations = documentFixtureViolations(
    'docs/fixture.md',
    '현재 상태는 [이전 상태](../STATUS-2026-09-09.md)를 참조한다.',
  );
  assert.ok(violations.some((violation) => violation.includes('STATUS-2026-09-09.md')), 'expected STATUS reference violation');
});

test('scanner rejects tracked root STATUS files', () => {
  const violations = trackedStatusFixtureViolations(['STATUS-2026-09-09.md', 'docs/작업-현황.md']);
  assert.ok(violations.some((violation) => violation.includes('STATUS-2026-09-09.md')), 'expected tracked root STATUS violation');
  assert.equal(violations.some((violation) => violation.includes('docs/작업-현황.md')), false, 'nested status-like docs are not root snapshots');
});

test('canonical documents describe one current product and keep history out of the active tree', () => {
  const violations = findDocumentationViolations();
  assert.deepEqual(violations, [], `documentation identity violations:\n${violations.join('\n')}`);
});
