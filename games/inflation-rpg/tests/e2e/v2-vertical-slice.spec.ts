import { test, expect } from '@playwright/test';

test.describe('Phase V1a vertical slice', () => {
  test('Start cycle → overworld → BP exhausted → result screen → back to menu', async ({ page }) => {
    // bpMax = 100 (Sim-G) means a live cycle runs ~5-10 minutes. Tween + arrival
    // delay = ~3-5s per arrival × ~98 arrivals → up to ~9 min wall clock.
    test.setTimeout(720_000);

    await page.goto('/games/inflation-rpg');
    await page.evaluate(() => localStorage.removeItem('korea_inflation_rpg_save'));
    await page.reload();

    // Click main-menu start
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible();
    await page.getByTestId('btn-start-cycle').click();

    // CyclePrepV2 shows hero preview
    await expect(page.getByTestId('cycle-prep-v2')).toBeVisible();
    await expect(page.getByTestId('spawned-hero-name')).toBeVisible();
    await page.getByTestId('btn-prep-start').click();

    // OverworldRunner mounts
    await expect(page.getByTestId('overworld-runner')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('overworld-hud')).toBeVisible();

    // Wait for cycle-result (bpMax=100 ⇒ ~5-10 min live)
    await expect(page.getByTestId('cycle-result-v2')).toBeVisible({ timeout: 600_000 });
    await expect(page.getByTestId('result-hero-name')).toBeVisible();
    await expect(page.getByTestId('result-narrative-list')).toBeVisible();

    // Back to menu
    await page.getByText(/메인 메뉴/).click();
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible();
  });
});
