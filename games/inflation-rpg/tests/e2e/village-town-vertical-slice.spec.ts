import { expect, test } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const Village_SAVE_KEY = 'shin-ui-eternal-sponsor-save-v2';
const Village_RECOVERY_BACKUP_KEY = `${Village_SAVE_KEY}-recovery-backup`;
const V3_SAVE_KEY = 'korea_inflation_rpg_save';

test.describe('Village — 신의 마을 vertical slice', () => {
  test('신규 저장에서 시설 작업과 첫 원정을 시작한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('village-app')).toBeVisible();
    await expect(page.getByTestId('village-app').getByRole('heading', { name: '신의 마을: 영원의 후원자' })).toBeVisible();
    await expect(page.getByTestId('village-town-hub')).toContainText('17세');
    await expect(page.getByText('다음 판단 · 원정 준비')).toBeVisible();
    const layoutWidth = await page.evaluate(() => ({
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: document.documentElement.clientWidth,
    }));
    expect(layoutWidth.documentWidth).toBeLessThanOrEqual(layoutWidth.viewportWidth + 1);

    const firstTaskButton = page.getByRole('button', { name: '작업 시작' }).first();
    expect((await firstTaskButton.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    await firstTaskButton.click();
    await expect(page.getByText('진행 확인')).toBeVisible();
    expect((await page.getByRole('button', { name: '닫기' }).boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '길잡이와 출발' }).click();
    await expect(page.getByTestId('village-active-expedition')).toContainText('원정 진행 중');
  });

  test('설정 화면에서 Village 음소거 상태를 저장한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);

    await page.getByRole('button', { name: /설정/ }).click();
    await expect(page.getByRole('heading', { name: '설정' })).toBeVisible();
    for (const row of await page.locator('.village-setting-row').all()) {
      expect((await row.boundingBox())?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await page.getByRole('checkbox', { name: '모든 소리 음소거' }).check();
    await page.reload();

    await page.getByRole('button', { name: /설정/ }).click();
    await expect(page.getByRole('checkbox', { name: '모든 소리 음소거' })).toBeChecked();
    await expect(page.getByText('현재 게임 전용 저장')).toBeVisible();
  });

  test('주요 Village 화면 이동 후 제목으로 포커스를 안내한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await expect(page.getByTestId('village-town-hub')).toBeVisible();

    const navigation = page.getByRole('navigation', { name: '주요 메뉴' });
    await navigation.getByRole('button', { name: /영웅/ }).click();
    await expect(page.locator('.village-hero-name')).toBeFocused();

    await navigation.getByRole('button', { name: /사가/ }).click();
    await expect(page.getByRole('heading', { name: '영원의 사가' })).toBeFocused();

    await page.getByRole('button', { name: /설정/ }).click();
    await expect(page.getByRole('heading', { name: '설정' })).toBeFocused();

    await page.getByRole('button', { name: '← 마을로' }).click();
    await expect(page.locator('.village-hero-name')).toBeFocused();
  });

  test('8시간 초과 offline 정산 결과를 표시한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await expect(page.getByTestId('village-app')).toBeVisible();
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { createdAt: number; lastProcessedAt: number };
      save.createdAt = Date.now() - 9 * 60 * 60 * 1000;
      save.lastProcessedAt = save.createdAt;
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('village-offline-result')).toBeVisible();
    await expect(page.getByTestId('village-offline-result')).toContainText('최대 8시간');
  });

  test('오프라인 보스 확인 결과에서 원정 화면으로 바로 이동한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '길잡이와 출발' }).click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as {
        meta: { agents: Array<{ id: string; activeTaskId: string | null }> };
        run: { expedition: { id: string; completesAt: number; encounterIndex: number } | null };
      };
      if (!save.run.expedition) throw new Error('expedition was not started');
      save.run.expedition.id = 'e2e-offline-route';
      const guide = save.meta.agents.find((agent) => agent.id === 'guide');
      if (!guide) throw new Error('guide was not created');
      guide.activeTaskId = save.run.expedition.id;
      save.run.expedition.encounterIndex = 2;
      save.run.expedition.completesAt = Date.now() - 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('village-offline-result')).toBeVisible();
    await expect(page.getByTestId('village-offline-result')).toContainText('위험 원정 결과 확인 필요');
    await page.getByRole('button', { name: '원정 결과 보기' }).click();
    await expect(page.getByTestId('village-active-expedition')).toContainText('원정 결과 확인 필요');
    await expect(page.getByRole('heading', { name: '원정소' })).toBeFocused();
    await page.getByRole('button', { name: '보스 결과 확인' }).click();
    await expect(page.getByTestId('village-expedition-result')).toBeVisible();
  });

  test('손상된 저장은 원본을 보존한 복구 화면을 거친다', async ({ page }) => {
    await page.goto(GAME_URL);
    const raw = JSON.stringify({ schemaVersion: 999, preserved: true });
    await page.evaluate(([key, value]) => localStorage.setItem(key, value), [Village_SAVE_KEY, raw]);
    await page.reload();

    await expect(page.getByTestId('village-save-recovery')).toContainText('기존 저장을 덮어쓰지 않았습니다');
    expect(await page.evaluate((key) => localStorage.getItem(key), Village_SAVE_KEY)).toBe(raw);

    await page.getByRole('button', { name: '새 현재 게임 저장 시작' }).click();
    await expect(page.getByTestId('village-town-hub')).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), Village_RECOVERY_BACKUP_KEY)).toBe(raw);
    expect(JSON.parse(await page.evaluate((key) => localStorage.getItem(key), Village_SAVE_KEY) ?? '{}').schemaVersion).toBe(2);
  });

  test('Village 부팅은 V3 저장 키를 변경하지 않는다', async ({ page }) => {
    await page.goto(GAME_URL);
    const legacyRaw = JSON.stringify({ version: 27, marker: 'legacy-preserved' });
    await page.evaluate(([key, value]) => {
      localStorage.setItem(key, value);
      localStorage.removeItem('shin-ui-eternal-sponsor-save-v2');
    }, [V3_SAVE_KEY, legacyRaw]);
    await page.reload();

    await expect(page.getByTestId('village-town-hub')).toBeVisible();
    expect(await page.evaluate((key) => localStorage.getItem(key), V3_SAVE_KEY)).toBe(legacyRaw);
  });

  test('신의 개입으로 영웅을 즉시 회복하고 충전을 소비한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { run: { hero: { hp: number }; interventionCharges: number } };
      save.run.hero.hp = 1;
      save.run.interventionCharges = 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await page.getByRole('button', { name: '즉시 회복' }).click();
    await expect(page.getByTestId('village-town-hub')).toContainText('HP 1,000/1,000');
    await expect(page.getByTestId('village-town-hub')).toContainText('충전 0/3');
  });

  test('원정 귀환 후 성공 결과와 다음 준비 정보를 표시한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '길잡이와 출발' }).click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as {
        meta: { agents: Array<{ id: string; activeTaskId: string | null }> };
        run: { expedition: { id: string; completesAt: number; encounterIndex: number } | null };
      };
      if (!save.run.expedition) throw new Error('expedition was not started');
      save.run.expedition.id = 'e2e-victory-4';
      const guide = save.meta.agents.find((agent) => agent.id === 'guide');
      if (!guide) throw new Error('guide was not created');
      guide.activeTaskId = save.run.expedition.id;
      save.run.expedition.encounterIndex = 2;
      save.run.expedition.completesAt = Date.now() - 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('village-offline-result')).toBeVisible();
    await page.getByRole('button', { name: '마을 확인' }).click();
    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await expect(page.getByTestId('village-active-expedition')).toContainText('원정 결과 확인 필요');
    await page.getByRole('button', { name: '보스 결과 확인' }).click();
    await expect(page.getByTestId('village-expedition-result')).toContainText('원정 성공');
    await expect(page.getByTestId('village-expedition-result')).toContainText('전투력');
  });

  test('위험 원정은 오프라인 복귀 후 명시적 확인 전까지 보류된다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '혼자 출발' }).first().click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as {
        createdAt: number;
        updatedAt: number;
        lastProcessedAt: number;
        meta: { unlockedRealms: string[]; sagaEntries: Array<{ createdAt: number }> };
        run: { hero: { hp: number }; expedition: { realmId: string; startedAt: number; completesAt: number; encounterIndex: number } | null };
      };
      if (!save.run.expedition) throw new Error('expedition was not started');
      save.run.hero.hp = 1;
      save.meta.unlockedRealms.push('deep_forest');
      save.run.expedition.realmId = 'deep_forest';
      save.run.expedition.encounterIndex = 2;
      save.run.expedition.completesAt = Date.now() - 1;
      save.createdAt = Date.now() - 60_000;
      save.run.expedition.startedAt = save.createdAt;
      save.lastProcessedAt = save.createdAt;
      save.updatedAt = save.createdAt;
      save.meta.sagaEntries = save.meta.sagaEntries.map((entry) => ({ ...entry, createdAt: save.createdAt }));
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('village-offline-result')).toContainText('위험 원정 결과 확인 필요');
    await page.getByRole('button', { name: '마을 확인' }).click();
    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await expect(page.getByTestId('village-active-expedition')).toContainText('원정 결과 확인 필요');
    await page.getByRole('button', { name: '보스 결과 확인' }).click();
    await expect(page.getByTestId('village-expedition-result')).toContainText('원정 중단');
    await expect(page.getByTestId('village-expedition-result')).toContainText('추천 시설');
  });

  test('이미 보류된 위험 원정도 재접속 후 마을 목표에서 확인을 안내한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '혼자 출발' }).first().click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as {
        createdAt: number;
        updatedAt: number;
        lastProcessedAt: number;
        meta: { unlockedRealms: string[]; sagaEntries: Array<{ createdAt: number }> };
        run: { expedition: { realmId: string; startedAt: number; completesAt: number; encounterIndex: number; status: string } | null };
      };
      if (!save.run.expedition) throw new Error('expedition was not started');
      save.meta.unlockedRealms.push('deep_forest');
      save.run.expedition.realmId = 'deep_forest';
      save.run.expedition.encounterIndex = 2;
      save.run.expedition.status = 'awaiting_confirmation';
      save.createdAt = Date.now() - 60_000;
      save.run.expedition.startedAt = save.createdAt;
      save.run.expedition.completesAt = Date.now() - 1;
      save.lastProcessedAt = save.createdAt;
      save.updatedAt = save.createdAt;
      save.meta.sagaEntries = save.meta.sagaEntries.map((entry) => ({ ...entry, createdAt: save.createdAt }));
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('village-offline-result')).toContainText('위험 원정 결과 확인 필요');
    await page.getByRole('button', { name: '마을 확인' }).click();
    await expect(page.getByTestId('village-top-objective')).toContainText('원정 결과 확인이 필요합니다.');
    await expect(page.getByTestId('village-top-objective')).toContainText('원정 화면에서 귀환을 확정하세요.');

    await page.reload();
    await expect(page.getByTestId('village-top-objective')).toContainText('원정 결과 확인이 필요합니다.');
  });

  test('위험 보스 승리 뒤 숲의 선택으로 다음 영역을 연다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '혼자 출발' }).first().click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as {
        createdAt: number;
        meta: { unlockedRealms: string[] };
        run: {
          hero: { atk: number; def: number; defBase: number; hp: number; hpMax: number };
          expedition: { id: string; realmId: string; startedAt: number; completesAt: number; encounterIndex: number } | null;
        };
      };
      if (!save.run.expedition) throw new Error('expedition was not started');
      save.meta.unlockedRealms.push('deep_forest');
      save.run.hero.atk = 10_000;
      save.run.hero.def = 10_000;
      save.run.hero.defBase = 10_000;
      save.run.hero.hp = 10_000;
      save.run.hero.hpMax = 10_000;
      save.run.expedition.id = 'e2e-victory-4';
      save.run.expedition.realmId = 'deep_forest';
      save.run.expedition.encounterIndex = 2;
      save.run.expedition.completesAt = Date.now() - 1;
      save.createdAt = Date.now() - 60_000;
      save.run.expedition.startedAt = save.createdAt;
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('village-offline-result')).toContainText('위험 원정 결과 확인 필요');
    await page.getByRole('button', { name: '마을 확인' }).click();
    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await expect(page.getByTestId('village-active-expedition')).toContainText('원정 결과 확인 필요');
    await page.getByRole('button', { name: '보스 결과 확인' }).click();
    await expect(page.getByTestId('village-expedition-result')).toContainText('원정 성공');
    await page.getByRole('button', { name: '사가에서 선택하기' }).click();
    await expect(page.getByRole('heading', { name: '흑송 산군의 불씨' })).toBeVisible();
    await page.getByRole('button', { name: '불씨를 지킨다' }).click();
    await page.getByRole('navigation', { name: '주요 메뉴' }).getByRole('button', { name: /원정/ }).click();
    await expect(page.locator('.village-realm-card').filter({ hasText: '저승' }).getByRole('button', { name: '혼자 출발' })).toBeEnabled();
  });

  test('안전 원정도 보스 결과와 다음 Realm 해금을 각각 명시적으로 확정한다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);

    await page.getByRole('button', { name: '원정 준비 →' }).click();
    await page.getByRole('button', { name: '길잡이와 출발' }).click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as {
        createdAt: number;
        lastProcessedAt: number;
        meta: { agents: Array<{ id: string; activeTaskId: string | null }> };
        run: { expedition: { id: string; startedAt: number; completesAt: number; encounterIndex: number } | null };
      };
      if (!save.run.expedition) throw new Error('expedition was not started');
      save.run.expedition.id = 'e2e-victory-4';
      const guide = save.meta.agents.find((agent) => agent.id === 'guide');
      if (!guide) throw new Error('guide was not created');
      guide.activeTaskId = save.run.expedition.id;
      save.run.expedition.encounterIndex = 2;
      save.run.expedition.completesAt = Date.now() - 1;
      save.createdAt = Date.now() - 60_000;
      save.lastProcessedAt = save.createdAt;
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('village-offline-result')).toContainText('위험 원정 결과 확인 필요');
    await page.getByRole('button', { name: '원정 결과 보기' }).click();
    await expect(page.getByTestId('village-active-expedition')).toContainText('원정 결과 확인 필요');
    await page.getByRole('button', { name: '보스 결과 확인' }).click();
    await expect(page.getByTestId('village-expedition-result')).toContainText('원정 성공');
    await expect(page.getByRole('button', { name: '깊은 숲 기록하기' })).toBeVisible();
    await expect(page.locator('.village-realm-card').filter({ hasText: '신목 들판' }).getByRole('button', { name: '기록 먼저 확정' }).first()).toBeDisabled();
    await page.getByRole('button', { name: '깊은 숲 기록하기' }).click();
    await expect(page.locator('.village-realm-card').filter({ hasText: '깊은 숲' }).getByRole('button', { name: '길잡이와 출발' })).toBeEnabled();
  });

  test('피로한 지원 에이전트는 마을에서 휴식시킬 수 있다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { meta: { agents: Array<{ id: string; fatigue: number }> } };
      const agent = save.meta.agents.find((candidate) => candidate.id === 'blacksmith');
      if (!agent) throw new Error('blacksmith was not created');
      agent.fatigue = 100;
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await page.getByRole('button', { name: '휴식' }).first().click();
    await expect(page.getByTestId('village-town-hub')).toContainText('피로 75');
  });

  test('훈련소 작업이 영웅 레벨과 행동 상태에 반영된다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { run: { hero: { exp: number } } };
      save.run.hero.exp = 80;
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    const training = page.locator('.village-facility').filter({ hasText: '훈련소' });
    await training.getByRole('button', { name: '작업 시작' }).click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { meta: { tasks: Record<string, { facilityId: string; completesAt: number }> } };
      const task = Object.values(save.meta.tasks).find((candidate) => candidate.facilityId === 'training');
      if (!task) throw new Error('training task was not started');
      task.completesAt = Date.now() - 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('village-town-hub')).toContainText('Lv.2');
    await expect(training).toContainText('작업 시작');
  });

  test('대장간 장비가 영웅 전투력에 반영된다', async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), Village_SAVE_KEY);
    await page.reload();
    await page.waitForFunction((key) => Boolean(localStorage.getItem(key)), Village_SAVE_KEY);

    const blacksmith = page.locator('.village-facility').filter({ hasText: '대장간' });
    await blacksmith.getByRole('button', { name: '작업 시작' }).click();
    await page.evaluate((key) => {
      const raw = localStorage.getItem(key);
      if (!raw) throw new Error('v4 save was not created');
      const save = JSON.parse(raw) as { meta: { tasks: Record<string, { facilityId: string; completesAt: number }> } };
      const task = Object.values(save.meta.tasks).find((candidate) => candidate.facilityId === 'blacksmith');
      if (!task) throw new Error('blacksmith task was not started');
      task.completesAt = Date.now() - 1;
      localStorage.setItem(key, JSON.stringify(save));
    }, Village_SAVE_KEY);
    await page.reload();

    await expect(page.getByTestId('village-offline-result')).toBeVisible();
    await page.getByRole('button', { name: '마을 확인' }).click();
    await page.getByRole('button', { name: '영웅 상세' }).click();
    await expect(page.getByText('마을의 철검 · Lv.1')).toBeVisible();
    await expect(page.getByText('공격 +80')).toBeVisible();
  });
});
