import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test('v8 persist save migrates to v9 with auto-rolled modifiers', async ({ page }) => {
  // 1. 빈 localStorage 로 시작
  await page.goto(GAME_URL);

  // 2. v8 형태 save 주입 (zustand persist envelope 따름, key = 'korea_inflation_rpg_save')
  // baseId 'w-knife' 는 common weapon (data/equipment.ts 에 존재)
  await page.evaluate((key) => {
    const v8Save = {
      state: {
        meta: {
          inventory: {
            weapons: [{ instanceId: 'w-knife-1', baseId: 'w-knife', enhanceLv: 0 }],
            armors: [],
            accessories: [],
          },
        },
        run: null,
      },
      version: 8,
    };
    localStorage.setItem(key, JSON.stringify(v8Save));
  }, SAVE_KEY);

  // 3. 게임 reload — zustand persist 가 v8 → v9 마이그레이션 실행
  await page.reload();
  // UI 렌더 성공 여부가 아닌 localStorage 마이그레이션 완료만 검증 (minimal seed 는 render crash 가능)
  await page.waitForFunction(
    (key) => {
      const raw = localStorage.getItem(key);
      return !!raw && JSON.parse(raw).version === 9;
    },
    SAVE_KEY,
    { timeout: 10000 }
  );

  // 4. localStorage 의 새 state 확인 — version 9 + modifiers 부착
  const migratedState = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, SAVE_KEY);

  expect(migratedState).toBeTruthy();
  expect(migratedState.version).toBe(9);
  expect(migratedState.state.meta.inventory.weapons[0].modifiers).toBeDefined();
  expect(Array.isArray(migratedState.state.meta.inventory.weapons[0].modifiers)).toBe(true);
  expect(migratedState.state.meta.inventory.weapons[0].modifiers.length).toBeGreaterThanOrEqual(1);
  expect(migratedState.state.meta.adsWatched).toBe(0);
});
