import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

/**
 * Build a complete v14 persist envelope (Phase 5 — adFreeOwned + lastIapTx[]).
 * Seeding at version === persist.version means no migration runs.
 */
function seedV14Save(opts: { adFreeOwned?: boolean } = {}) {
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
        adsLastResetTs: 0,
        // ---- Phase Compass (v12) + Realms (v13) ----
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
        // ---- Phase 5 (v14) — Monetization ----
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

test.describe('monetization — IAP flow (web stub)', () => {
  test('ad_free purchase: shop → buy → AD-FREE badge appears', async ({ page }) => {
    // Seed a clean v14 save with adFreeOwned=false, already on main-menu.
    await page.goto(GAME_URL);
    await page.evaluate(
      ([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV14Save({ adFreeOwned: false }))],
    );
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10_000 });

    // MainMenu → Settings
    await page.getByRole('button', { name: '설정' }).click();
    await expect(page.getByRole('button', { name: /상점/ })).toBeVisible({ timeout: 5_000 });

    // Settings → IAP Shop
    await page.getByRole('button', { name: /상점/ }).click();

    // IAP Shop — wait for it to render (h2 = "상점")
    await expect(page.locator('h2').filter({ hasText: '상점' })).toBeVisible({ timeout: 5_000 });

    // Find the "광고 제거" card and click its buy button.
    // The web stub MonetizationService.queryProducts() resolves with price "₩1,200".
    // Button text is the price string once init completes, or "—" if still loading.
    // We wait for the button to become enabled (not disabled) before clicking.
    const adFreeCard = page.locator('li').filter({ hasText: '광고 제거' });
    const buyBtn = adFreeCard.getByRole('button');
    // Wait up to 3s for the price to load (queryProducts has 200 ms stub delay)
    await expect(buyBtn).toBeEnabled({ timeout: 3_000 });
    await buyBtn.click();

    // Wait for purchase result toast — web stub succeeds after ~200 ms
    await expect(page.getByText('구매 완료')).toBeVisible({ timeout: 5_000 });

    // Navigate back: IAP Shop ← button → Settings, then Settings "뒤로" → MainMenu
    await page.getByRole('button', { name: '←' }).click();   // shop → settings
    await page.getByRole('button', { name: '뒤로' }).click(); // settings → main-menu

    // AD-FREE badge should now be visible on MainMenu
    await expect(page.getByRole('status', { name: /광고가 제거/ })).toBeVisible({ timeout: 5_000 });
  });

  test('restore after reload — ad_free entitlement persists via localStorage', async ({ page }) => {
    // Seed localStorage with adFreeOwned=true directly (mimics post-purchase state).
    await page.goto(GAME_URL);
    await page.evaluate(
      ([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV14Save({ adFreeOwned: true }))],
    );
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10_000 });

    // AD-FREE badge should appear on MainMenu immediately on hydration
    await expect(page.getByRole('status', { name: /광고가 제거/ })).toBeVisible({ timeout: 10_000 });
  });
});
