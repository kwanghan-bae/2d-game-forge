import { expect, test, type Page } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg-legacy';
const SAVE_KEY = 'korea_inflation_rpg_save';

async function resolveNonTimedChoiceOverlays(page: Page) {
  // 10x 진행에서는 선택 모달이 열려도 Phaser가 다음 도착을 계속 만들 수
  // 있다. V3-C와 같은 방식으로 비타이머 선택만 즉시 확정해 Realm 전환
  // 검증이 선택 UI의 대기 시간에 종속되지 않도록 한다.
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const danger = page.getByTestId('danger-choice-modal');
    if (await danger.isVisible().catch(() => false)) {
      await page.getByTestId('danger-choice-fight').click();
      continue;
    }
    const shrine = page.getByTestId('shrine-choice-modal');
    if (await shrine.isVisible().catch(() => false)) {
      await page.getByTestId('shrine-choice-gold').click();
      continue;
    }
    return;
  }
}

test.describe('V3-H — Depth + Polish', () => {
  test.setTimeout(300_000);

  test('base → sea 전환 (Bug A+B fix) + status modal + season HUD', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => { localStorage.removeItem(key); }, SAVE_KEY);
    await page.reload();
    await page.evaluate(() => {
      (window as unknown as { __inflation_rpg_test_seed__?: number }).__inflation_rpg_test_seed__ = 1;
    });

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
    await expect(async () => {
      await resolveNonTimedChoiceOverlays(page);
      // Locator assertion은 기본 5초 동안 대기하므로, 그 사이 새 선택
      // 모달이 열리면 해소 함수가 다시 호출되지 않는다. 현재 텍스트를
      // 즉시 읽어 polling 한 번을 짧게 유지한다.
      const realmText = await page.getByTestId('hud-realm').innerText();
      expect(realmText).not.toContain('1/6');
    }).toPass({ timeout: 120_000 });
  });
});
