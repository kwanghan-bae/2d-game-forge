import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

// SKIPPED in B-3α — these tests rely on the legacy "게임 시작" entry button which
// MainMenu 가 제거함 (구 flow 진입로 차단). 구 flow 코드 자체는 B-3β 에서 일괄
// 제거 예정이므로 임시 마이그레이션 대신 skip 으로 처리. 신 flow 의 e2e 는
// dungeon-flow.spec.ts 에 신설.
test.describe.skip('Inflation RPG — full run smoke test', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.reload();
    // Wait for React hydration
    await page.waitForSelector('.forge-screen', { timeout: 10000 });
  });

  test('main menu renders', async ({ page }) => {
    await expect(page.getByText('INFLATION')).toBeVisible();
    await expect(page.getByRole('button', { name: '게임 시작' })).toBeVisible();
  });

  test('can select a character and start run', async ({ page }) => {
    await page.getByRole('button', { name: '게임 시작' }).click();
    await expect(page.getByText('영웅을 선택하라')).toBeVisible();
    // 화랑 is always unlocked (soulGrade 0)
    await page.getByRole('button', { name: '화랑' }).first().click();
    await page.getByRole('button', { name: '모험 시작' }).click();
    // WorldMap shows BP header
    await expect(page.getByText(/BP.*30/)).toBeVisible();
  });

  test('can enter an area and see battle', async ({ page }) => {
    await page.getByRole('button', { name: '게임 시작' }).click();
    await page.getByRole('button', { name: '화랑' }).first().click();
    await page.getByRole('button', { name: '모험 시작' }).click();
    // WorldMap: click first region (조선 평야) to open RegionMap
    await page.getByRole('button', { name: '조선 평야' }).click();
    // RegionMap: Enter first area — transitions to Dungeon screen
    await page.getByRole('button', { name: '마을 입구' }).click();
    // Dungeon header shows stage progress (마을 입구 has stageCount: 7)
    await expect(page.getByText(/Stage 1 \/ \d+/)).toBeVisible({ timeout: 5000 });
    // BP decrements to 29 (encounter cost)
    await expect(page.getByText(/BP.*29/)).toBeVisible({ timeout: 5000 });
  });

  test('run ends when BP reaches 0', async ({ page }) => {
    await page.evaluate((key) => {
      localStorage.setItem(key, JSON.stringify({
        state: {
          meta: {
            inventory: { weapons: [], armors: [], accessories: [] },
            baseAbilityLevel: 0, soulGrade: 0, hardModeUnlocked: false,
            characterLevels: {}, bestRunLevel: 0,
            normalBossesKilled: [], hardBossesKilled: [], gold: 0,
          },
        },
        version: 0,
      }));
    }, SAVE_KEY);
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10000 });

    await page.getByRole('button', { name: '게임 시작' }).click();
    await page.getByRole('button', { name: '화랑' }).first().click();
    await page.getByRole('button', { name: '모험 시작' }).click();

    // Force BP to 1 via Zustand store
    await page.evaluate(() => {
      // @ts-expect-error window interop
      const store = window.__zustand_inflation_rpg_store__;
      if (store) {
        store.setState((s: Record<string, unknown>) => ({
          run: { ...(s['run'] as object), bp: 1 },
        }));
      }
    });

    // WorldMap: click first region (조선 평야) to open RegionMap
    await page.getByRole('button', { name: '조선 평야' }).click();
    // RegionMap: Enter first area
    await page.getByRole('button', { name: '마을 입구' }).click();
    // BP 1 → encounter deducts 1 → 0 → run ends
    await expect(page.getByText('런 종료')).toBeVisible({ timeout: 10000 });
  });
});
