import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';
const STORE_GLOBAL = '__zustand_inflation_rpg_store__';

/**
 * Build a complete v13 persist envelope with an active run for hwarang.
 * Uses 'hwarang' (not '') so computeMaxHp exercises the real character path
 * instead of hitting the 100-fallback.
 * run.playerHp is set to null so hydratePlayerHpIfNull can be called.
 */
function seedV13RunSave() {
  return {
    state: {
      meta: {
        // ---- Phase G (v10) baseline ----
        ascPoints: 0,
        ascTier: 0,
        crackStones: 0,
        ascTree: {
          hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
          dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
          mod_magnitude: 0, effect_proc: 0,
        },
        tutorialDone: true,
        tutorialStep: -1,
        dungeonFinalsCleared: [],
        inventory: { weapons: [], armors: [], accessories: [] },
        equippedItemIds: [],
        equipSlotCount: 1,
        lastPlayedCharId: 'hwarang',
        baseAbilityLevel: 0,
        soulGrade: 0,
        hardModeUnlocked: false,
        characterLevels: {},
        bestRunLevel: 0,
        normalBossesKilled: [],
        hardBossesKilled: [],
        gold: 0,
        dr: 0,
        enhanceStones: 0,
        questProgress: {},
        questsCompleted: [],
        regionsVisited: [],
        musicVolume: 0.5,
        sfxVolume: 0.7,
        muted: false,
        dungeonProgress: {},
        pendingFinalClearedId: null,
        jp: {},
        jpEarnedTotal: {},
        jpCap: { hwarang: 50, mudang: 50, choeui: 50 },
        jpFirstKillAwarded: {},
        jpCharLvAwarded: {},
        skillLevels: {},
        ultSlotPicks: {
          hwarang: [null, null, null, null],
          mudang:  [null, null, null, null],
          choeui:  [null, null, null, null],
        },
        adsWatched: 0,
        // ---- Phase E (v11) — Relics + Mythic + Ads ----
        relicStacks: {
          warrior_banner: 0, dokkaebi_charm: 0, gold_coin: 0, soul_pearl: 0,
          sands_of_time: 0, fate_dice: 0, moonlight_amulet: 0, eagle_arrow: 0,
          undead_coin: 0, feather_of_fate: 0,
        },
        mythicOwned: [] as string[],
        mythicEquipped: [null, null, null, null, null] as (string | null)[],
        mythicSlotCap: 0,
        adsToday: 0,
        adsLastResetTs: Date.now(),
        // ---- Phase Compass (v12) ----
        dungeonMiniBossesCleared: [],
        dungeonMajorBossesCleared: [],
        // ---- Phase Realms (v13) — full 17-key compassOwned ----
        compassOwned: {
          plains_first:      false,
          plains_second:     false,
          forest_first:      false,
          forest_second:     false,
          mountains_first:   false,
          mountains_second:  false,
          sea_first:         false,
          sea_second:        false,
          volcano_first:     false,
          volcano_second:    false,
          underworld_first:  false,
          underworld_second: false,
          heaven_first:      false,
          heaven_second:     false,
          chaos_first:       false,
          chaos_second:      false,
          omni:              false,
        },
      },
      // Active run — hwarang at level 1; playerHp starts null (pre-hydration)
      run: {
        characterId: 'hwarang',
        level: 1,
        exp: 0,
        bp: 30,
        statPoints: 0,
        allocated: { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 },
        currentDungeonId: 'plains',
        currentFloor: 1,
        isHardMode: false,
        monstersDefeated: 0,
        goldThisRun: 0,
        currentStage: 1,
        dungeonRunMonstersDefeated: 0,
        featherUsed: 0,
        playerHp: null,
      },
      screen: 'town',
    },
    version: 13,
  };
}

test.describe('Phase Realms — lifesteal heals run.playerHp', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
  });

  test('applyLifestealHeal increases run.playerHp, clamped to maxHp', async ({ page }) => {
    // Seed: v13 envelope with active hwarang run (playerHp=null pre-hydration)
    await page.evaluate(
      ([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV13RunSave())],
    );
    await page.reload();

    // Wait for the dev-only store hook to be exposed (mounted after StartGame runs)
    await page.waitForFunction(
      (g) => typeof (window as unknown as Record<string, unknown>)[g as string] !== 'undefined',
      STORE_GLOBAL,
      { timeout: 10_000 },
    );

    // Hydrate playerHp (null → maxHp) — mirrors what BattleScene does on entry
    await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { hydratePlayerHpIfNull: () => void } }>)[g];
      store.getState().hydratePlayerHpIfNull();
    }, STORE_GLOBAL);

    const maxHp = await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { run: { playerHp: number | null } } }>)[g];
      return store.getState().run.playerHp;
    }, STORE_GLOBAL);
    expect(maxHp).toBeGreaterThan(0);  // hwarang has real stats, not fallback 100

    // Drop playerHp to 50 to simulate damage taken during battle
    await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { applyDamageToPlayer: (n: number) => void; run: { playerHp: number } } }>)[g];
      const current = store.getState().run.playerHp;
      store.getState().applyDamageToPlayer(current - 50);
    }, STORE_GLOBAL);

    const hpAfterDamage = await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { run: { playerHp: number | null } } }>)[g];
      return store.getState().run.playerHp;
    }, STORE_GLOBAL);
    expect(hpAfterDamage).toBe(50);

    // Apply lifesteal heal — serpent_fang procs lifestealHeal = damageDealt * 0.2
    // Here we invoke the action directly (value = 30, as if attack dealt 150 dmg * 0.2)
    await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { applyLifestealHeal: (n: number) => void } }>)[g];
      store.getState().applyLifestealHeal(30);
    }, STORE_GLOBAL);

    const hpAfterHeal = await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { run: { playerHp: number | null } } }>)[g];
      return store.getState().run.playerHp;
    }, STORE_GLOBAL);
    // 50 + 30 = 80
    expect(hpAfterHeal).toBe(80);

    // Verify overflow clamping: heal beyond maxHp must not exceed maxHp
    await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { applyLifestealHeal: (n: number) => void } }>)[g];
      store.getState().applyLifestealHeal(1_000_000);
    }, STORE_GLOBAL);

    const hpAfterOverheal = await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { run: { playerHp: number | null } } }>)[g];
      return store.getState().run.playerHp;
    }, STORE_GLOBAL);
    expect(hpAfterOverheal).toBe(maxHp);
  });

  test('applyDamageToPlayer reduces run.playerHp, clamped to 0', async ({ page }) => {
    // Seed: v13 envelope with active hwarang run
    await page.evaluate(
      ([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV13RunSave())],
    );
    await page.reload();

    await page.waitForFunction(
      (g) => typeof (window as unknown as Record<string, unknown>)[g as string] !== 'undefined',
      STORE_GLOBAL,
      { timeout: 10_000 },
    );

    // Hydrate and capture maxHp
    await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { hydratePlayerHpIfNull: () => void } }>)[g];
      store.getState().hydratePlayerHpIfNull();
    }, STORE_GLOBAL);

    const maxHp = await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { run: { playerHp: number | null } } }>)[g];
      return store.getState().run.playerHp;
    }, STORE_GLOBAL);
    expect(maxHp).toBeGreaterThan(0);

    // Apply damage — normal case: maxHp → maxHp-40
    await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { applyDamageToPlayer: (n: number) => void } }>)[g];
      store.getState().applyDamageToPlayer(40);
    }, STORE_GLOBAL);

    const hpAfterDamage = await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { run: { playerHp: number | null } } }>)[g];
      return store.getState().run.playerHp;
    }, STORE_GLOBAL);
    expect(hpAfterDamage).toBe((maxHp as number) - 40);

    // Apply lethal damage — must clamp to 0, not go negative
    await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { applyDamageToPlayer: (n: number) => void } }>)[g];
      store.getState().applyDamageToPlayer(1_000_000);
    }, STORE_GLOBAL);

    const hpAfterLethal = await page.evaluate((g) => {
      const store = (window as unknown as Record<string, { getState: () => { run: { playerHp: number | null } } }>)[g];
      return store.getState().run.playerHp;
    }, STORE_GLOBAL);
    expect(hpAfterLethal).toBe(0);
  });
});
