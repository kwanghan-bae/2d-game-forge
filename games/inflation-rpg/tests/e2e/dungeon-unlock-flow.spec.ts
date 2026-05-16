import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

/**
 * Build a complete v13 persist envelope.
 * v13 adds 5 new dungeon pairs to compassOwned (sea/volcano/underworld/heaven/chaos)
 * and playerHp to RunState on top of the full v12 shape.
 * Seeding at version === persist.version means no migration runs.
 */
function seedV13Save(opts: {
  ascTier: number;
  omni?: boolean;
}) {
  return {
    state: {
      meta: {
        // ---- Phase G (v10) baseline ----
        ascPoints: 0,
        ascTier: opts.ascTier,
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
          omni:              !!opts.omni,
        },
      },
      // INITIAL_RUN-shaped seed — v13 adds playerHp: null
      run: {
        characterId: '',
        level: 1,
        exp: 0,
        bp: 30,
        statPoints: 0,
        allocated: { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 },
        currentDungeonId: null,
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

test.describe('Phase Realms — dungeon unlock flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
  });

  test('locked dungeons show tier-gate hints in free-select mode at ascTier 0', async ({ page }) => {
    // Seed: ascTier=0, omni owned (enables free-select button), town screen
    await page.evaluate(
      ([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV13Save({ ascTier: 0, omni: true }))],
    );
    await page.reload();
    await page.waitForSelector('[data-testid="town-enter-dungeon"]', { timeout: 10000 });

    // Open modal → switch to free mode
    await page.getByTestId('town-enter-dungeon').click();
    await page.getByTestId('pick-free-mode').click();

    // Tier-gate hints are visible for the 5 locked dungeons
    // sea requires Tier 1, volcano requires Tier 3, underworld Tier 5, heaven Tier 8, chaos Tier 12
    await expect(page.getByTestId('free-card-hint-sea')).toBeVisible();
    await expect(page.getByTestId('free-card-hint-sea')).toContainText('Tier 1');
    await expect(page.getByTestId('free-card-hint-volcano')).toBeVisible();
    await expect(page.getByTestId('free-card-hint-volcano')).toContainText('Tier 3');
    await expect(page.getByTestId('free-card-hint-chaos')).toBeVisible();
    await expect(page.getByTestId('free-card-hint-chaos')).toContainText('Tier 12');

    // The 3 always-unlocked dungeons have no hint
    await expect(page.getByTestId('free-card-hint-plains')).toHaveCount(0);
    await expect(page.getByTestId('free-card-hint-forest')).toHaveCount(0);
    await expect(page.getByTestId('free-card-hint-mountains')).toHaveCount(0);
  });

  test('ascTier 2 unlocks sea but keeps volcano + higher tiers disabled', async ({ page }) => {
    // Seed: ascTier=2 — sea (Tier 1) unlocked, volcano (Tier 3) still locked
    await page.evaluate(
      ([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV13Save({ ascTier: 2, omni: true }))],
    );
    await page.reload();
    await page.waitForSelector('[data-testid="town-enter-dungeon"]', { timeout: 10000 });

    await page.getByTestId('town-enter-dungeon').click();
    await page.getByTestId('pick-free-mode').click();

    // sea (Tier 1) — unlocked but omni doesn't provide second-tier free-select, only first-tier
    // omni bypasses the compass-owned check entirely, so sea IS selectable once unlocked
    await expect(page.getByTestId('free-card-sea')).not.toBeDisabled();
    // volcano (Tier 3) — still locked at ascTier=2
    await expect(page.getByTestId('free-card-volcano')).toBeDisabled();
    // Tier-gate hint for volcano still present
    await expect(page.getByTestId('free-card-hint-volcano')).toBeVisible();
    // No hint for sea (it is now unlocked)
    await expect(page.getByTestId('free-card-hint-sea')).toHaveCount(0);
  });

  test('all 8 dungeons enabled in free-select mode at ascTier 12', async ({ page }) => {
    // Seed: ascTier=12 — all dungeons unlocked; omni grants free-select on all
    await page.evaluate(
      ([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV13Save({ ascTier: 12, omni: true }))],
    );
    await page.reload();
    await page.waitForSelector('[data-testid="town-enter-dungeon"]', { timeout: 10000 });

    await page.getByTestId('town-enter-dungeon').click();
    await page.getByTestId('pick-free-mode').click();

    // All 8 dungeons selectable — none disabled, no tier-gate hints
    for (const id of ['plains', 'forest', 'mountains', 'sea', 'volcano', 'underworld', 'heaven', 'chaos']) {
      await expect(page.getByTestId(`free-card-${id}`)).not.toBeDisabled();
      await expect(page.getByTestId(`free-card-hint-${id}`)).toHaveCount(0);
    }
  });
});
