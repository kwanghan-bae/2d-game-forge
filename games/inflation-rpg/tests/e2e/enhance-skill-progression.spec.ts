import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test.describe('Phase F-2+3 — Enhance + SkillProgression smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10000 });
    const overlay = page.getByTestId('tutorial-overlay');
    if (await overlay.isVisible()) {
      await page.getByRole('button', { name: '건너뛰기' }).click();
      await overlay.waitFor({ state: 'hidden', timeout: 3000 });
    }
  });

  test('town → 직업소 → 광고 시청 → cap +50 visible', async ({ page }) => {
    await page.getByRole('button', { name: /마을로/ }).click();
    await page.getByTestId('town-skill-progression').click();
    await expect(page.getByText(/직업소/)).toBeVisible();
    await page.getByTestId('watch-ad-btn').click();
    // After ad: cap should be 100. Look for "/100" appearance.
    await expect(page.getByText(/\/100/)).toBeVisible();
  });
});
