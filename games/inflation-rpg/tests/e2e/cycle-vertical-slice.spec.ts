import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test.describe('Phase Sim-A vertical slice', () => {
  test('Start Cycle (NEW) → cycle ends → CycleResult shows maxLevel', async ({ page }) => {
    // The rAF-driven cycle runs at ~100 ms real-time per 100 ms simulated.
    // bpMax=30 × ~600 ms/kill ≈ 18 s simulated → allow generous wall-clock budget.
    test.setTimeout(90_000);
    await page.goto(GAME_URL);

    // Clear persist to ensure deterministic start (fresh save = tutorialDone:false).
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.reload();

    // Wait for the game shell to mount.
    await page.waitForSelector('.forge-screen', { timeout: 10_000 });

    // New user → TutorialOverlay may auto-appear; dismiss it so buttons are accessible.
    const overlay = page.getByTestId('tutorial-overlay');
    if (await overlay.isVisible()) {
      await page.getByRole('button', { name: '건너뛰기' }).click();
      await overlay.waitFor({ state: 'hidden', timeout: 3_000 });
    }

    // Click the "사이클 시작 (NEW)" button on MainMenu.
    await page.getByTestId('btn-start-cycle').click();

    // CycleRunner should mount.
    await expect(page.getByTestId('cycle-runner')).toBeVisible({ timeout: 5_000 });

    // Wait for the cycle to finish (BP exhaustion).
    // bpMax=30, each kill −1 BP, 600 ms/round → ~18 s simulated = ~18 s real (100 ms rAF tick).
    // Allow 60 s to cover slow CI environments.
    await expect(page.getByTestId('cycle-result')).toBeVisible({ timeout: 60_000 });

    // Verify result data elements are present.
    await expect(page.getByTestId('result-max-level')).toBeVisible();
    await expect(page.getByTestId('result-reason')).toContainText(/bp_exhausted|abandoned|forced/);

    // Return to main menu via the result back button.
    await page.getByRole('button', { name: '메인 메뉴로' }).click();

    // MainMenu should be visible again with btn-start-cycle.
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible({ timeout: 5_000 });
  });
});
