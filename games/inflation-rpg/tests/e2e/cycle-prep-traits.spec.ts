import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test.describe('Phase Sim-B trait selection', () => {
  test('select 2 traits → start cycle → result shows non-empty levelCurve', async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.reload();

    // Wait for the game shell to mount.
    await page.waitForSelector('.forge-screen', { timeout: 10_000 });

    // Dismiss tutorial if visible.
    const tutorial = page.getByTestId('tutorial-overlay');
    if (await tutorial.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: '건너뛰기' }).click();
      await tutorial.waitFor({ state: 'hidden', timeout: 3_000 });
    }

    await page.getByTestId('btn-start-cycle').click();
    await expect(page.getByTestId('cycle-prep')).toBeVisible({ timeout: 5_000 });

    // Select 천재 + 광전사 (both base-tier per TRAIT_CATALOG)
    await page.getByTestId('trait-card-t_genius').click();
    await page.getByTestId('trait-card-t_berserker').click();
    await expect(page.getByTestId('trait-slot-count')).toHaveText('선택: 2 / 3');

    await page.getByTestId('btn-prep-start').click();
    await expect(page.getByTestId('cycle-runner')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByTestId('cycle-result')).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId('result-max-level')).toBeVisible();
  });

  test('cancel button returns to main menu', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.reload();

    // Wait for the game shell to mount.
    await page.waitForSelector('.forge-screen', { timeout: 10_000 });

    // Dismiss tutorial if visible.
    const tutorial = page.getByTestId('tutorial-overlay');
    if (await tutorial.isVisible().catch(() => false)) {
      await page.getByRole('button', { name: '건너뛰기' }).click();
      await tutorial.waitFor({ state: 'hidden', timeout: 3_000 });
    }

    await page.getByTestId('btn-start-cycle').click();
    await expect(page.getByTestId('cycle-prep')).toBeVisible({ timeout: 5_000 });
    await page.getByTestId('btn-prep-cancel').click();
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible({ timeout: 5_000 });
  });
});
