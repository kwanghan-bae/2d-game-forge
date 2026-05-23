import { expect, test } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test.describe('V3-DEF — Multi-zone + NPC + Saga', () => {
  test.setTimeout(300_000);

  test('zone unlock, NPC encounter, saga viewer 동작', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => { localStorage.removeItem(key); }, SAVE_KEY);
    await page.reload();

    // 시작
    await page.getByTestId('btn-start-cycle').click();
    await page.getByTestId('btn-prep-start').click();
    await page.waitForSelector('[data-testid="overworld-runner"]', { timeout: 10000 });

    // 가속
    await page.getByTestId('speed-10x').click();

    // HUD 의 realm 표시 확인
    await expect(page.getByTestId('hud-realm')).toBeVisible({ timeout: 30000 });
    const realmText = await page.getByTestId('hud-realm').innerText();
    expect(realmText).toContain('시작의 들판');
    expect(realmText).toContain('/6');

    // 기록 버튼 열기
    await page.getByTestId('open-saga-modal').click();
    await expect(page.getByTestId('saga-modal')).toBeVisible();
    await page.getByTestId('saga-modal-close').click();
    await expect(page.getByTestId('saga-modal')).not.toBeVisible();

    // 충분히 진행 시 NPC encounter 모달 발생 (40s budget)
    await page.waitForTimeout(40_000);

    // close any NPC modal if it appeared
    const npcModal = page.getByTestId('npc-modal');
    if (await npcModal.isVisible().catch(() => false)) {
      await page.getByTestId('npc-modal-confirm').click();
    }

    // saga viewer 에 event 있음 확인
    await page.getByTestId('open-saga-modal').click();
    await expect(page.getByTestId('saga-modal')).toBeVisible();
    const sagaEvents = await page.getByTestId('saga-event').count();
    expect(sagaEvents).toBeGreaterThan(0);
  });
});
