import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test('v8 persist save migrates through v9→v10→v11→v12 with auto-rolled modifiers + ascTree + Phase E defaults + Phase Compass defaults', async ({ page }) => {
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

  // 3. 게임 reload — zustand persist 가 v8 → v9 → v10 → v11 → v12 체인 마이그레이션 실행
  await page.reload();
  await page.waitForFunction(
    (key) => {
      const raw = localStorage.getItem(key);
      return !!raw && JSON.parse(raw).version === 12;
    },
    SAVE_KEY,
    { timeout: 10000 }
  );

  // 4. localStorage 검증 — version 12 + v9 modifiers + v10 ascTree + v11 Phase E + v12 Phase Compass
  const migratedState = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, SAVE_KEY);

  expect(migratedState).toBeTruthy();
  expect(migratedState.version).toBe(12);
  // v9 — auto-rolled modifiers
  expect(migratedState.state.meta.inventory.weapons[0].modifiers).toBeDefined();
  expect(Array.isArray(migratedState.state.meta.inventory.weapons[0].modifiers)).toBe(true);
  expect(migratedState.state.meta.inventory.weapons[0].modifiers.length).toBeGreaterThanOrEqual(1);
  expect(migratedState.state.meta.adsWatched).toBe(0);
  // v10 — Phase G ascTree 초기 0 주입
  expect(migratedState.state.meta.ascTree).toBeDefined();
  expect(migratedState.state.meta.ascTree.hp_pct).toBe(0);
  expect(migratedState.state.meta.ascTree.effect_proc).toBe(0);
  // v11 — Phase E defaults
  expect(migratedState.state.meta.relicStacks).toBeDefined();
  expect(migratedState.state.meta.relicStacks.warrior_banner).toBe(0);
  expect(migratedState.state.meta.relicStacks.feather_of_fate).toBe(0);
  expect(migratedState.state.meta.mythicOwned).toEqual([]);
  expect(migratedState.state.meta.mythicEquipped).toEqual([null, null, null, null, null]);
  expect(typeof migratedState.state.meta.mythicSlotCap).toBe('number');
  expect(migratedState.state.meta.adsToday).toBe(0);
  expect(typeof migratedState.state.meta.adsLastResetTs).toBe('number');

  // v12 — Phase Compass defaults
  const compassOwned = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw);
    return env.state?.meta?.compassOwned ?? null;
  }, SAVE_KEY);
  expect(compassOwned).not.toBeNull();
  expect(compassOwned.plains_first).toBe(false);
  expect(compassOwned.omni).toBe(false);

  const cleared = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw);
    return {
      mini: env.state?.meta?.dungeonMiniBossesCleared,
      major: env.state?.meta?.dungeonMajorBossesCleared,
    };
  }, SAVE_KEY);
  expect(cleared!.mini).toEqual([]);
  expect(cleared!.major).toEqual([]);
});
