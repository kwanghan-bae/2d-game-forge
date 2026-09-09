import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflow = readFileSync(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
const gamePlaywrightConfig = readFileSync(
  new URL('../../games/inflation-rpg/playwright.config.ts', import.meta.url),
  'utf8',
);

test('game E2E CI installs browsers required by desktop and iPhone projects', () => {
  assert.match(gamePlaywrightConfig, /devices\['Desktop Chrome'\]/);
  assert.match(gamePlaywrightConfig, /devices\['iPhone 14'\]/);

  const installStep = workflow.match(
    /pnpm --filter @forge\/game-inflation-rpg exec playwright install --with-deps ([^\n]+)/,
  );
  assert.ok(installStep, 'game-e2e Playwright install step is missing');
  assert.match(installStep[1], /\bchromium\b/);
  assert.match(installStep[1], /\bwebkit\b/);
});
