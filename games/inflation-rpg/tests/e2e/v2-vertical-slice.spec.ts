import { test, expect } from '@playwright/test';

test.describe('Phase V1a vertical slice', () => {
  test('Start cycle → overworld → natural death → result screen → back to menu', async ({ page }) => {
    test.setTimeout(60_000);

    // V3 regression coverage must use the preserved legacy entrypoint now
    // that the product's default route mounts the V4 town hub.
    await page.goto('/games/inflation-rpg-legacy');
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
    // The live legacy loop can take several minutes to reach natural death.
    // Use the explicit dev-only cycle hook to put the already-running hero at
    // the final action before the next real arrival. This preserves the full
    // React → Phaser → controller → cycle-result path without making CI wait
    // through 1,000 simulated actions.
    await page.getByTestId('speed-10x').click();
    await expect(page.getByTestId('speed-10x')).toHaveAttribute('data-active', 'true');
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const cycleStore = w['__cycle_store_v2__'] as {
        getState(): {
          controller: {
            getHero(): { age: number; actionCount: number; chapter: string; staggered: boolean };
          } | null;
        };
      } | undefined;
      const hero = cycleStore?.getState().controller?.getHero();
      if (!hero) throw new Error('cycle controller test hook not exposed');
      hero.age = 69;
      hero.actionCount = 999;
      hero.chapter = '노년기';
      hero.staggered = false;
    });

    // Next arrival ticks age to 70 and follows the real natural-death result path.
    await expect(page.getByTestId('cycle-result-v2')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('result-hero-name')).toBeVisible();
    await expect(page.getByTestId('result-narrative-list')).toBeVisible();

    // Back to menu
    await page.getByText(/메인 메뉴/).click();
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible();
  });
});
