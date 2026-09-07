import { expect, test } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg-legacy';
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

    // 고정 sleep은 RNG와 여러 smoke를 같은 서버에서 연속 실행할 때
    // 간헐적으로 부족해진다. 실제 base 탈출 신호를 기다리되, 무한 대기는
    // 막아 stale-realm 회귀가 생기면 명확히 실패하도록 한다.
    await expect(page.getByTestId('hud-realm')).not.toContainText('1/6', { timeout: 120_000 });
  });
});
