import { test, expect, type Page } from '@playwright/test';

async function resolveBlockingLegacyChoices(page: Page) {
  // The dev-only hero fast-forward can land on a boss while the real Phaser
  // loop is still running. Resolve the boss intro immediately so the smoke
  // checks the result pipeline instead of waiting through a second choice.
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const bossIntro = page.getByTestId('boss-intro-modal');
    if (await bossIntro.isVisible().catch(() => false)) {
      await page.getByTestId('boss-intro-card-0').click();
      continue;
    }
    return;
  }
}

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
            getHero(): {
              age: number;
              actionCount: number;
              chapter: string;
              staggered: boolean;
              rejuvenationCount: number;
            };
          } | null;
        };
      } | undefined;
      const hero = cycleStore?.getState().controller?.getHero();
      if (!hero) throw new Error('cycle controller test hook not exposed');
      hero.age = 69;
      hero.actionCount = 999;
      hero.chapter = '노년기';
      // Mark the fixture as recovering from a prior battle. The next real
      // Phaser arrival then takes the controller's stagger-recovery branch,
      // ticks age 69 → 70, and reaches natural death without racing the
      // unrelated combat-death/free-rejuvenation branch.
      hero.staggered = true;
      // The product may auto-rejuvenate at age 65 when enough light has been
      // earned during the fast-forward. Exhaust that normal per-cycle budget
      // so this smoke deterministically exercises the natural-death result
      // path instead of racing the optional rejuvenation branch.
      hero.rejuvenationCount = 2;
    });

    // Next arrival ticks age to 70 and follows the real natural-death result path.
    await expect(async () => {
      await resolveBlockingLegacyChoices(page);
      expect(await page.getByTestId('cycle-result-v2').count()).toBeGreaterThan(0);
    }).toPass({ timeout: 30_000 });
    await expect(page.getByTestId('cycle-result-v2')).toBeVisible();
    await expect(page.getByTestId('result-hero-name')).toBeVisible();
    await expect(page.getByTestId('result-narrative-list')).toBeVisible();

    // Back to menu
    await page.getByText(/메인 메뉴/).click();
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible();
  });
});
