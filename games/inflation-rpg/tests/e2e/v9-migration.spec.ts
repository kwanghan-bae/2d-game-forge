import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test('v8 persist save migrates through v9→v10→v11→v12→v13→v14→v15→v16 with auto-rolled modifiers + ascTree + Phase E defaults + Phase Compass defaults + Phase Realms expansion + Phase 5 IAP + Phase Sim-A cycleHistory + Phase Sim-B traitsUnlocked', async ({ page }) => {
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

  // 3. 게임 reload — zustand persist 가 v8 → v9 → v10 → v11 → v12 → v13 → v14 → v15 → v16 체인 마이그레이션 실행
  await page.reload();
  await page.waitForFunction(
    (key) => {
      const raw = localStorage.getItem(key);
      return !!raw && JSON.parse(raw).version === 16;
    },
    SAVE_KEY,
    { timeout: 10000 }
  );

  // 4. localStorage 검증 — version 16 + v9 modifiers + v10 ascTree + v11 Phase E + v12 Phase Compass + v13 Phase Realms + v14 Phase 5 IAP + v15 Phase Sim-A + v16 Phase Sim-B
  const migratedState = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, SAVE_KEY);

  expect(migratedState).toBeTruthy();
  expect(migratedState.version).toBe(16);
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

  // v12 — Phase Compass defaults + v13 Phase Realms expansion (5 new dungeons × 2 = 10 new compass entries)
  const compassOwned = await page.evaluate((key) => {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const env = JSON.parse(raw);
    return env.state?.meta?.compassOwned ?? null;
  }, SAVE_KEY);
  expect(compassOwned).not.toBeNull();
  // 8 dungeons × 2 tiers + omni = 17 keys after v13 (was 7 after v12)
  expect(Object.keys(compassOwned).length).toBe(17);
  expect(compassOwned.plains_first).toBe(false);
  expect(compassOwned.sea_first).toBe(false);      // Phase Realms new
  expect(compassOwned.volcano_second).toBe(false); // Phase Realms new
  expect(compassOwned.chaos_first).toBe(false);    // Phase Realms new
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

  // v13 Phase Realms — run.playerHp default null (run is null in this envelope, so no assertion)

  // v14 Phase 5 — adFreeOwned + lastIapTx[]
  expect(migratedState.state.meta.adFreeOwned).toBe(false);
  expect(migratedState.state.meta.lastIapTx).toEqual([]);

  // v15 Phase Sim-A — cycleHistory[]
  expect(migratedState.state.meta.cycleHistory).toEqual([]);

  // v16 Phase Sim-B — traitsUnlocked seeded with base-tier traits
  expect(Array.isArray(migratedState.state.meta.traitsUnlocked)).toBe(true);
  expect(migratedState.state.meta.traitsUnlocked).toEqual(
    expect.arrayContaining(['t_genius', 't_fragile', 't_challenge', 't_timid'])
  );
  // mid/rare traits NOT in initial unlock pool
  expect(migratedState.state.meta.traitsUnlocked).not.toContain('t_boss_hunter');
  expect(migratedState.state.meta.traitsUnlocked).not.toContain('t_terminal_genius');
});
