import { expect, test } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

/**
 * Cycle 1 F2.16 + F3.16 — SagaBookModal 의 'all'/'npc' filter 가 신규
 * realmEnter / npcEncounter / npcDeath / familyEvent narrative 를 노출하는지 검증.
 *
 * 전략: 실제 simulation 으로 base→sea 전환 + 청년기 milestone 도달까지 기다리면
 * RNG variance 와 sim:cycle timing 에 의해 chromium project 가 flake 한다
 * (실측: 90s @ 10x = 8세, 청년기 진입 안 됨).
 * 본 테스트의 본질은 filter+render path 회귀 가드 — 직접 store 의 recordSagaEvent
 * 로 4 신규 SagaEventType narrative 를 inject 한 뒤 SagaBookModal 의 filter 동작
 * 만 확인한다. dead path wire (Task 7) 는 별도 vitest 에서 검증됨.
 */

test.describe('Cycle 1 — Variance + Realm Tone + NPC Saga', () => {
  test.setTimeout(120_000);

  test('F2.16 + F3.16: SagaBookModal filter 가 realm 진입 + NPC 발화 노출', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => { localStorage.removeItem(key); }, SAVE_KEY);
    await page.reload();

    // 시작 → overworld
    await page.getByTestId('btn-start-cycle').click();
    await page.getByTestId('btn-prep-start').click();
    await page.waitForSelector('[data-testid="overworld-runner"]', { timeout: 15000 });

    // store 에 4 신규 SagaEventType narrative 직접 inject (어린시절 chapter).
    // recordToStore wire 는 vitest CycleControllerV2 / EternalSaga 에서 회귀 가드됨.
    await page.evaluate(() => {
      const w = window as unknown as Record<string, unknown>;
      const store = w['__zustand_inflation_rpg_store__'] as {
        getState(): {
          recordSagaEvent(event: {
            age: number;
            type: string;
            narrativeText: string;
            payload: Record<string, unknown>;
          }, chapter: string): void;
        };
      } | undefined;
      if (!store) throw new Error('zustand store not exposed');
      const api = store.getState();
      api.recordSagaEvent(
        { age: 12, type: 'realmEnter', narrativeText: '(12세) 바다 안개가 발치까지 올라왔다 — 심해의 문이 열렸다.', payload: { from: 'base', to: 'sea' } },
        '어린시절',
      );
      api.recordSagaEvent(
        { age: 18, type: 'npcEncounter', narrativeText: '(18세) 한 늙은 자가 길을 막았다 — 그의 눈은 자신의 미래를 보고 있었다. 멘토를 만났다.', payload: { kind: 'mentor' } },
        '청년기',
      );
      api.recordSagaEvent(
        { age: 32, type: 'familyEvent', narrativeText: '(32세) 종소리 아래 결혼식을 올렸다.', payload: { eventKind: 'marriage' } },
        '장년기',
      );
      api.recordSagaEvent(
        { age: 55, type: 'npcDeath', narrativeText: '(55세) 멘토가 침대에서 일어나지 못했다 — 한 시대가 끝났다.', payload: { kind: 'mentor' } },
        '노년기',
      );
    });

    // F2.16: SagaBookModal 'all' filter 가 realmEnter narrative 노출.
    await page.getByTestId('open-saga-modal').click();
    const modal = page.getByTestId('saga-modal');
    await expect(modal).toBeVisible();

    // 'all' filter 가 기본 클릭됨 — realm enter narrative 의 keyword 검증.
    await modal.getByTestId('saga-filter-all').click();
    await expect(modal).toContainText('심해의 문', { timeout: 5_000 });

    // F3.16: 'npc' filter → NPC + family narrative 노출.
    await modal.getByTestId('saga-filter-npc').click();
    // 매핑된 4 신규 type (npcEncounter / npcDeath / familyEvent) + 기존 (moralChoice/shrine)
    // 중 inject 한 3 narrative 의 키워드 검증.
    await expect(modal).toContainText('멘토를 만났다', { timeout: 5_000 });
    await expect(modal).toContainText('결혼식', { timeout: 5_000 });
    await expect(modal).toContainText('일어나지 못했다', { timeout: 5_000 });

    // 'npc' filter 가 realmEnter 는 숨김 (회귀 가드)
    await expect(modal).not.toContainText('심해의 문', { timeout: 1_000 });

    // 닫고 끝.
    await page.getByTestId('saga-modal-close').click();
    await expect(modal).not.toBeVisible();
  });
});
