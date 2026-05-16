import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

/**
 * Build a minimal v14 persist envelope (Phase 5).
 * Seeding at version === persist.version means no migration runs.
 */
function seedV14Save(opts: { adFreeOwned?: boolean } = {}) {
  return {
    state: {
      meta: {
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
        relicStacks: {
          warrior_banner: 0, dokkaebi_charm: 0, gold_coin: 0, soul_pearl: 0,
          sands_of_time: 0, fate_dice: 0, moonlight_amulet: 0, eagle_arrow: 0,
          undead_coin: 0, feather_of_fate: 0,
        },
        mythicOwned: [] as string[],
        mythicEquipped: [null, null, null, null, null] as (string | null)[],
        mythicSlotCap: 0,
        adsToday: 0,
        adsLastResetTs: 0,
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
        dungeonMiniBossesCleared: [],
        dungeonMajorBossesCleared: [],
        // Phase 5 (v14)
        adFreeOwned: opts.adFreeOwned ?? false,
        lastIapTx: [],
      },
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
      screen: 'main-menu',
    },
    version: 14,
  };
}

/**
 * Read adFreeOwned from localStorage.
 * Native AdMob banner visibility cannot be asserted in a web Playwright run —
 * there is no real ad network. This test verifies the entitlement state machine
 * that controls banner show/hide on device.
 */
async function readAdFreeOwned(page: import('@playwright/test').Page): Promise<boolean | null> {
  return page.evaluate((key: string) => {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { state?: { meta?: { adFreeOwned?: boolean } } };
      return parsed.state?.meta?.adFreeOwned ?? null;
    } catch {
      return null;
    }
  }, SAVE_KEY);
}

test.describe('monetization — adFreeOwned entitlement (banner resize)', () => {
  test('adFreeOwned toggles in store after ad_free purchase', async ({ page }) => {
    // Seed a clean v14 save with adFreeOwned=false.
    await page.goto(GAME_URL);
    await page.evaluate(
      ([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV14Save({ adFreeOwned: false }))],
    );
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10_000 });

    // Verify initial state: adFreeOwned is false.
    const initial = await readAdFreeOwned(page);
    expect(initial === null || initial === false).toBe(true);

    // Navigate: MainMenu → Settings → IAP Shop.
    await page.getByRole('button', { name: '설정' }).click();
    await expect(page.getByRole('button', { name: /상점/ })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: /상점/ }).click();
    await expect(page.locator('h2').filter({ hasText: '상점' })).toBeVisible({ timeout: 5_000 });

    // Click the "광고 제거" buy button (web stub resolves in ~200 ms).
    const adFreeCard = page.locator('li').filter({ hasText: '광고 제거' });
    const buyBtn = adFreeCard.getByRole('button');
    await expect(buyBtn).toBeEnabled({ timeout: 3_000 });
    await buyBtn.click();

    // Wait for purchase confirmation toast.
    await expect(page.getByText('구매 완료')).toBeVisible({ timeout: 5_000 });

    // adFreeOwned must be true in the persisted store.
    const after = await readAdFreeOwned(page);
    expect(after).toBe(true);
  });

  test('adFreeOwned=true on reload — entitlement persists across sessions', async ({ page }) => {
    // Seed localStorage with adFreeOwned=true directly (mimics post-purchase reload).
    await page.goto(GAME_URL);
    await page.evaluate(
      ([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV14Save({ adFreeOwned: true }))],
    );
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10_000 });

    // Entitlement must survive the reload (no purchase step needed).
    const persisted = await readAdFreeOwned(page);
    expect(persisted).toBe(true);

    // AD-FREE badge should be visible on MainMenu confirming the UI reacts to the entitlement.
    await expect(page.getByRole('status', { name: /광고가 제거/ })).toBeVisible({ timeout: 10_000 });
  });
});
