import { expect, test, type Page } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg-legacy';
const SAVE_KEY = 'korea_inflation_rpg_save';

async function resolveNonTimedChoiceOverlays(page: Page) {
  // The legacy simulation keeps moving at 10x, so a shrine or danger choice
  // can be open when this test reaches the HUD. Resolve only those two
  // non-timed choices; timed choices self-resolve through their idle fallback.
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

test.describe('V3-C — spend modal + light emit', () => {
  test('적 처치 후 hud-light 증가 + 신의 메뉴 → 첫 buff 구매', async ({ page }) => {
    // light = 100 까지 누적해야 move_speed x1 구매 가능. 10x 가속 + 여유.
    test.setTimeout(300_000);

    // 1. 빈 localStorage 로 시작 (stale meta.light pre-pass 방지)
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
    await page.reload();

    // 2. Main menu → cycle prep → start cycle (v2-vertical-slice 와 동일 path)
    await expect(page.getByTestId('btn-start-cycle')).toBeVisible();
    await page.getByTestId('btn-start-cycle').click();

    await expect(page.getByTestId('cycle-prep-v2')).toBeVisible();
    await page.getByTestId('btn-prep-start').click();

    // 3. Overworld 도착
    await expect(page.getByTestId('overworld-runner')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('hud-light')).toBeVisible();

    // 4. 10x 가속 — light 누적 시간 단축
    await page.getByTestId('speed-10x').click();

    // 5. hud-light 양수 — 적 한 마리 처치만 되면 1+ 가 보장
    //    innerText 가 floater span ('+1.0' 등) 와 합쳐질 수 있으므로 leading
    //    "빛 N" 부분만 매치
    const lightLocator = page.getByTestId('hud-light');
    await expect(async () => {
      await resolveNonTimedChoiceOverlays(page);
      const text = await lightLocator.innerText();
      const m = text.match(/빛\s+(\d+)/);
      const value = m ? Number(m[1]) : 0;
      expect(value).toBeGreaterThan(0);
    }).toPass({ timeout: 60_000 });

    // 6. 신의 메뉴 열기 — modal visible
    await resolveNonTimedChoiceOverlays(page);
    await page.getByTestId('open-spend-modal').click();
    await expect(page.getByTestId('spend-modal')).toBeVisible();
    // modal 떠 있는 동안 시뮬은 계속 진행되어 light 가 누적된다.

    // 7. light >= 100 까지 polling (move_speed baseCost = 100)
    //    10x 가속 + kill 1 light + boss 10 light → ~100 light 가 60-120s 안에 도착해야 함.
    await expect(async () => {
      await resolveNonTimedChoiceOverlays(page);
      const text = await lightLocator.innerText();
      const m = text.match(/빛\s+(\d+)/);
      const value = m ? Number(m[1]) : 0;
      expect(value).toBeGreaterThanOrEqual(100);
    }).toPass({ timeout: 180_000 });

    // 8. modal 이 여전히 떠 있는지 확인, 안 떠 있으면 다시 연다
    await resolveNonTimedChoiceOverlays(page);
    if (!(await page.getByTestId('spend-modal').isVisible())) {
      await resolveNonTimedChoiceOverlays(page);
      await page.getByTestId('open-spend-modal').click();
      await expect(page.getByTestId('spend-modal')).toBeVisible();
    }

    // 9. move_speed x1 구매
    const buyBtn = page.getByTestId('buff-move_speed-x1');
    await expect(buyBtn).toBeVisible();
    await buyBtn.click();

    // 10. modal close
    await page.getByTestId('spend-modal-close').click();
    await expect(page.getByTestId('spend-modal')).not.toBeVisible();

    // 11. T10 — 회춘 5년 임시 버튼이 더 이상 존재하지 않음
    await expect(page.getByTestId('rejuvenate-button')).toHaveCount(0);
  });
});
