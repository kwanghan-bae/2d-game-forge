import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test.describe('Phase B-3α — dungeon flow smoke', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10000 });
    // MainMenu 가 신규 유저 판정 시 TutorialOverlay 를 자동 노출함.
    // 오버레이가 버튼 클릭을 가로막으므로 "건너뛰기" 로 즉시 닫는다.
    const overlay = page.getByTestId('tutorial-overlay');
    if (await overlay.isVisible()) {
      await page.getByRole('button', { name: '건너뛰기' }).click();
      await overlay.waitFor({ state: 'hidden', timeout: 3000 });
    }
  });

  test('main menu shows 마을로 entry (no 게임 시작 button)', async ({ page }) => {
    await expect(page.getByRole('button', { name: /마을로/ })).toBeVisible();
    await expect(page.getByRole('button', { name: '게임 시작' })).toHaveCount(0);
  });

  test('town → 평야 던전 → ClassSelect → DungeonFloors → floor 1 entry', async ({ page }) => {
    // Main menu → Town
    await page.getByRole('button', { name: /마을로/ }).click();

    // Town: 평야 던전 입장
    await page
      .getByTestId('town-dungeon-plains')
      .getByRole('button', { name: '입장' })
      .click();

    // ClassSelect: 화랑 (always unlocked) + 모험 시작
    await page.getByRole('button', { name: '화랑' }).first().click();
    await page.getByRole('button', { name: '모험 시작' }).click();

    // DungeonFloors: floor 1 active, 평야 nameKR shown
    await expect(page.getByText(/평야/)).toBeVisible();
    await expect(page.getByTestId('floor-card-1')).toBeVisible();
    await expect(page.getByTestId('floor-card-1')).not.toBeDisabled();
    await expect(page.getByTestId('floor-card-2')).toBeDisabled();

    // floor 1 진입 → battle 화면
    await page.getByTestId('floor-card-1').click();
    await expect(page.getByTestId('battle-header')).toBeVisible({ timeout: 5000 });
  });

  test('back to town clears currentDungeonId', async ({ page }) => {
    await page.getByRole('button', { name: /마을로/ }).click();
    await page
      .getByTestId('town-dungeon-plains')
      .getByRole('button', { name: '입장' })
      .click();
    await page.getByRole('button', { name: '화랑' }).first().click();
    await page.getByRole('button', { name: '모험 시작' }).click();

    // DungeonFloors → 마을로
    await page.getByTestId('dungeon-floors-back').click();
    // Town renders again
    await expect(page.getByText(/마을$/)).toBeVisible();
    await expect(page.getByTestId('town-dungeon-plains')).toBeVisible();
  });

  test('Phase B-3β1 — boss floor cards visually differentiated (locked state)', async ({ page }) => {
    // Main menu → Town
    await page.getByRole('button', { name: /마을로/ }).click();

    // Town: 평야 던전 입장
    await page
      .getByTestId('town-dungeon-plains')
      .getByRole('button', { name: '입장' })
      .click();

    // ClassSelect: 화랑 (always unlocked) + 모험 시작
    await page.getByRole('button', { name: '화랑' }).first().click();
    await page.getByRole('button', { name: '모험 시작' }).click();

    // DungeonFloors — floor 1 활성, floor 5/10/15/30 잠금 but data-boss 속성 검증
    await expect(page.getByTestId('floor-card-1')).toHaveAttribute('data-boss', 'none');
    await expect(page.getByTestId('floor-card-5')).toHaveAttribute('data-boss', 'mini');
    await expect(page.getByTestId('floor-card-10')).toHaveAttribute('data-boss', 'major');
    await expect(page.getByTestId('floor-card-15')).toHaveAttribute('data-boss', 'sub');
    await expect(page.getByTestId('floor-card-30')).toHaveAttribute('data-boss', 'final');
  });
});
