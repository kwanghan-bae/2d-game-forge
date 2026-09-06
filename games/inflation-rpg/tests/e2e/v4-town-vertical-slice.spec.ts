import { expect, test } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const V4_SAVE_KEY = 'shin-ui-eternal-sponsor-v4-save-v1';

test.describe('V4 — 신의 마을 vertical slice', () => {
  test('신규 저장에서 시설 작업과 첫 원정을 시작한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('v4-app')).toBeVisible();
    await expect(page.getByTestId('v4-app').getByRole('heading', { name: '신의 마을: 영원의 후원자' })).toBeVisible();
    await expect(page.getByTestId('v4-town-hub')).toContainText('17세');
    await expect(page.getByText('다음 판단 · 원정 준비')).toBeVisible();

    await page.getByRole('button', { name: '작업 시작' }).first().click();
    await expect(page.getByText('진행 확인')).toBeVisible();

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '길잡이와 출발' }).click();
    await expect(page.getByTestId('v4-active-expedition')).toContainText('원정 진행 중');
  });

  test('설정 화면에서 V4 음소거 상태를 저장한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);

    await page.getByRole('button', { name: /설정/ }).click();
    await expect(page.getByRole('heading', { name: '설정' })).toBeVisible();
    await page.getByRole('checkbox', { name: '모든 소리 음소거' }).check();
    await page.reload();

    await page.getByRole('button', { name: /설정/ }).click();
    await expect(page.getByRole('checkbox', { name: '모든 소리 음소거' })).toBeChecked();
    await expect(page.getByText('V4 전용 저장')).toBeVisible();
  });

  test('8시간 초과 offline 정산 결과를 표시한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await expect(page.getByTestId('v4-app')).toBeVisible();
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { lastProcessedAt: number };
      save.lastProcessedAt = Date.now() - 9 * 60 * 60 * 1000;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('v4-offline-result')).toBeVisible();
    await expect(page.getByTestId('v4-offline-result')).toContainText('최대 8시간');
  });

  test('신의 개입으로 영웅을 즉시 회복하고 충전을 소비한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { run: { hero: { hp: number }; interventionCharges: number } };
      save.run.hero.hp = 1;
      save.run.interventionCharges = 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    await page.getByRole('button', { name: '즉시 회복' }).click();
    await expect(page.getByTestId('v4-town-hub')).toContainText('HP 1,000/1,000');
    await expect(page.getByTestId('v4-town-hub')).toContainText('충전 0/3');
  });

  test('원정 귀환 후 성공 결과와 다음 준비 정보를 표시한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '길잡이와 출발' }).click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { run: { expedition: { completesAt: number; encounterIndex: number } | null } };
      if (!save.run.expedition) throw new Error('expedition was not started');
      save.run.expedition.encounterIndex = 2;
      save.run.expedition.completesAt = Date.now() - 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await expect(page.getByTestId('v4-expedition-result')).toContainText('원정 성공');
    await expect(page.getByTestId('v4-expedition-result')).toContainText('전투력');
  });

  test('위험 원정은 오프라인 복귀 후 명시적 확인 전까지 보류된다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '혼자 출발' }).first().click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as {
        meta: { unlockedRealms: string[] };
        run: { expedition: { realmId: string; completesAt: number; encounterIndex: number } | null };
      };
      if (!save.run.expedition) throw new Error('expedition was not started');
      save.meta.unlockedRealms.push('deep_forest');
      save.run.expedition.realmId = 'deep_forest';
      save.run.expedition.encounterIndex = 2;
      save.run.expedition.completesAt = Date.now() - 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await expect(page.getByTestId('v4-active-expedition')).toContainText('원정 결과 확인 필요');
    await page.getByRole('button', { name: '보스 결과 확인' }).click();
    await expect(page.getByTestId('v4-expedition-result')).toContainText('원정 중단');
    await expect(page.getByTestId('v4-expedition-result')).toContainText('추천 시설');
  });

  test('피로한 지원 에이전트는 마을에서 휴식시킬 수 있다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { meta: { agents: Array<{ id: string; fatigue: number }> } };
      const agent = save.meta.agents.find((candidate) => candidate.id === 'blacksmith');
      if (!agent) throw new Error('blacksmith was not created');
      agent.fatigue = 100;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    await page.getByRole('button', { name: '휴식' }).first().click();
    await expect(page.getByTestId('v4-town-hub')).toContainText('피로 75');
  });

  test('훈련소 작업이 영웅 레벨과 행동 상태에 반영된다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { run: { hero: { exp: number } } };
      save.run.hero.exp = 80;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    const training = page.locator('.v4-facility').filter({ hasText: '훈련소' });
    await training.getByRole('button', { name: '작업 시작' }).click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { meta: { tasks: Record<string, { facilityId: string; completesAt: number }> } };
      const task = Object.values(save.meta.tasks).find((candidate) => candidate.facilityId === 'training');
      if (!task) throw new Error('training task was not started');
      task.completesAt = Date.now() - 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('v4-town-hub')).toContainText('Lv.2');
    await expect(training).toContainText('작업 시작');
  });

  test('대장간 장비가 영웅 전투력에 반영된다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), V4_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), V4_SAVE_KEY);

    const blacksmith = page.locator('.v4-facility').filter({ hasText: '대장간' });
    await blacksmith.getByRole('button', { name: '작업 시작' }).click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { meta: { tasks: Record<string, { facilityId: string; completesAt: number }> } };
      const task = Object.values(save.meta.tasks).find((candidate) => candidate.facilityId === 'blacksmith');
      if (!task) throw new Error('blacksmith task was not started');
      task.completesAt = Date.now() - 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, V4_SAVE_KEY);
    await page.reload();

    await page.getByRole('button', { name: '영웅 상세' }).click();
    await expect(page.getByText('마을의 철검 · Lv.1')).toBeVisible();
    await expect(page.getByText('공격 +80')).toBeVisible();
  });
});
