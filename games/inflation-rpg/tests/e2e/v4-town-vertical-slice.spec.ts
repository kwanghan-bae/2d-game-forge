import { expect, test } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const V4_SAVE_KEY = 'shin-ui-eternal-sponsor-v4-save-v1';

test.describe('V4 — 신의 마을 vertical slice', () => {
  test('신규 저장에서 시설 작업과 첫 원정을 시작한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('v4-app')).toBeVisible();
    await expect(page.getByTestId('v4-app').getByRole('heading', { name: '신의 마을: 영원의 후원자' })).toBeVisible();
    await expect(page.getByTestId('v4-town-hub')).toContainText('17세');

    await page.getByRole('button', { name: '작업 시작' }).first().click();
    await expect(page.getByText('진행 확인')).toBeVisible();

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '길잡이와 출발' }).click();
    await expect(page.getByTestId('v4-active-expedition')).toContainText('원정 진행 중');
  });

  test('8시간 초과 offline 정산 결과를 표시한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await expect(page.getByTestId('v4-app')).toBeVisible();
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { lastProcessedAt: number };
      save.lastProcessedAt = Date.now() - 9 * 60 * 60 * 1000;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('v4-offline-result')).toBeVisible();
    await expect(page.getByTestId('v4-offline-result')).toContainText('최대 8시간');
  });

  test('신의 개입으로 영웅을 즉시 회복하고 충전을 소비한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { run: { hero: { hp: number }; interventionCharges: number } };
      save.run.hero.hp = 1;
      save.run.interventionCharges = 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    await page.getByRole('button', { name: '즉시 회복' }).click();
    await expect(page.getByTestId('v4-town-hub')).toContainText('HP 1,000/1,000');
    await expect(page.getByTestId('v4-town-hub')).toContainText('충전 0/3');
  });

  test('원정 귀환 후 성공 결과와 다음 준비 정보를 표시한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '길잡이와 출발' }).click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { run: { expedition: { completesAt: number } | null } };
      if (!save.run.expedition) throw new Error('expedition was not started');
      save.run.expedition.completesAt = Date.now() - 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await expect(page.getByTestId('v4-expedition-result')).toContainText('원정 성공');
    await expect(page.getByTestId('v4-expedition-result')).toContainText('전투력');
  });
});
