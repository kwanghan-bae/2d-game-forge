import { expect, test } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test.describe('V3-H — Depth + Polish', () => {
  test.setTimeout(300_000);

  test('base → sea 전환 (Bug A+B fix) + status modal + season HUD', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => { localStorage.removeItem(key); }, SAVE_KEY);
    await page.reload();

    // Start cycle
    await page.getByTestId('btn-start-cycle').click();
    await page.getByTestId('btn-prep-start').click();
    await page.waitForSelector('[data-testid="overworld-runner"]', { timeout: 10000 });
    await page.getByTestId('speed-10x').click();

    // 상태창 open/close
    await page.getByTestId('open-status-modal').click();
    await expect(page.getByTestId('status-modal')).toBeVisible();
    await page.getByTestId('status-modal-close').click();
    await expect(page.getByTestId('status-modal')).not.toBeVisible();

    // 메인 메뉴 버튼 존재 (V3-H B1)
    await expect(page.getByTestId('open-main-menu')).toBeVisible();

    // Season HUD (V3-H F6)
    await expect(page.getByTestId('hud-season')).toBeVisible();

    // 50초 대기 → base 탈출 검증 (Bug A+B fix)
    await page.waitForTimeout(50_000);

    // HUD realm 이 '시작의 들판' 외 다른 realm 또는 unlockedRealms count > 1
    const realmText = await page.getByTestId('hud-realm').innerText();
    const hasProgress = !realmText.includes('1/6');
    expect(hasProgress).toBe(true);
  });
});
