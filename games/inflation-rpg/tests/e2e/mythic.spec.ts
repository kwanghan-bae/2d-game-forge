import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

/**
 * v11 persist envelope ready for an ascend tier 0 → 1.
 * canAscend() requires:
 *   - dungeonFinalsCleared.length >= nextTier + 2  → 3 for tier 1
 *   - crackStones >= nextTier^2  (with asc_accel discount) → 1 for tier 1
 * MILESTONE_TIERS includes 1 → ascend should award 'tier1_charm' and set
 * mythicSlotCap = computeMythicSlotCap(1) = 1.
 */
function seedV11SaveReadyToAscend() {
  return {
    state: {
      meta: {
        // ---- Phase G (v10) baseline (copied from asctree.spec.ts) ----
        ascPoints: 0,
        ascTier: 0,
        crackStones: 99999,
        ascTree: {
          hp_pct: 0, atk_pct: 0, gold_drop: 0, bp_start: 0, sp_per_lvl: 0,
          dungeon_currency: 0, crit_damage: 0, asc_accel: 0,
          mod_magnitude: 0, effect_proc: 0,
        },
        tutorialDone: true,
        tutorialStep: -1,
        dungeonFinalsCleared: ['final-realm', 'r2', 'r3'],
        inventory: { weapons: [], armors: [], accessories: [] },
        equippedItemIds: [],
        equipSlotCount: 1,
        lastPlayedCharId: '',
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
        mythicOwned: [],
        mythicEquipped: [null, null, null, null, null],
        mythicSlotCap: 0,
        adsToday: 0,
        adsLastResetTs: Date.now(),
      },
      run: null,
      screen: 'town',
    },
    version: 11,
  };
}

const STORE_GLOBAL = '__zustand_inflation_rpg_store__';

test('Phase E — first ascend (0→1) awards tier1_charm + unlocks slot 1', async ({ page }) => {
  await page.goto(GAME_URL);
  await page.evaluate(([key, save]) => {
    localStorage.setItem(key as string, JSON.stringify(save));
  }, [SAVE_KEY, seedV11SaveReadyToAscend()] as const);
  await page.reload();

  // Wait for the dev-only store hook to be exposed (mounted after StartGame runs)
  await page.waitForFunction(
    (g) => typeof (window as unknown as Record<string, unknown>)[g as string] !== 'undefined',
    STORE_GLOBAL,
    { timeout: 10_000 },
  );

  // Sanity: precondition holds before ascend.
  const before = await page.evaluate((g) => {
    const store = (window as unknown as Record<string, { getState: () => { meta: { ascTier: number; mythicSlotCap: number; mythicOwned: string[] } } }>)[g];
    const m = store.getState().meta;
    return { ascTier: m.ascTier, slotCap: m.mythicSlotCap, owned: [...m.mythicOwned] };
  }, STORE_GLOBAL);
  expect(before.ascTier).toBe(0);
  expect(before.slotCap).toBe(0);
  expect(before.owned).toEqual([]);

  // Trigger ascend via store action (skips altar UI flow — UI exercised separately in vitest).
  const ascended = await page.evaluate((g) => {
    const store = (window as unknown as Record<string, { getState: () => { ascend: () => boolean } }>)[g];
    return store.getState().ascend();
  }, STORE_GLOBAL);
  expect(ascended).toBe(true);

  const after = await page.evaluate((g) => {
    const store = (window as unknown as Record<string, { getState: () => { meta: { ascTier: number; mythicSlotCap: number; mythicOwned: string[]; mythicEquipped: (string | null)[] } } }>)[g];
    const m = store.getState().meta;
    return {
      ascTier: m.ascTier,
      slotCap: m.mythicSlotCap,
      owned: [...m.mythicOwned],
      equipped: [...m.mythicEquipped],
    };
  }, STORE_GLOBAL);

  expect(after.ascTier).toBe(1);
  expect(after.slotCap).toBe(1);
  expect(after.owned).toContain('tier1_charm');
  // Award only — not auto-equipped.
  expect(after.equipped[0]).toBeNull();
});

test('Phase E — Mythic 탭에서 tier1_charm 장착 후 슬롯에 들어간다', async ({ page }) => {
  // Seed with tier1_charm already owned + slotCap 1 (post-ascend state) so we exercise the UI equip flow.
  await page.goto(GAME_URL);
  const seed = seedV11SaveReadyToAscend();
  seed.state.meta.ascTier = 1;
  seed.state.meta.mythicSlotCap = 1;
  seed.state.meta.mythicOwned = ['tier1_charm'];
  await page.evaluate(([key, save]) => {
    localStorage.setItem(key as string, JSON.stringify(save));
  }, [SAVE_KEY, seed] as const);
  await page.reload();

  // Town → 보물고 → Mythic tab
  await page.getByTestId('town-relics').click();
  await page.getByRole('button', { name: 'Mythic' }).click();

  // Slot cap reflects 1/5 + slots 1..4 locked
  await expect(page.getByTestId('mythic-slot-info')).toContainText('1/5');
  await expect(page.getByTestId('mythic-slot-1-locked')).toBeVisible();
  await expect(page.getByTestId('mythic-slot-4-locked')).toBeVisible();

  // Slot 0 starts empty; clicking 장착 on tier1_charm fills it
  await expect(page.getByTestId('mythic-slot-0-empty')).toBeVisible();
  await page.getByTestId('mythic-equip-btn-tier1_charm').click();
  await expect(page.getByTestId('mythic-slot-0-equipped')).toBeVisible();
});
