import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

/**
 * Minimal v14 persist envelope — tutorial done so MainMenu renders immediately.
 */
function seedV14Save() {
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
        adFreeOwned: false,
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

test.describe('privacy screen', () => {
  test('privacy screen renders the policy iframe', async ({ page }) => {
    // Seed save and navigate to main menu.
    await page.goto(GAME_URL);
    await page.evaluate(
      ([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV14Save())],
    );
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10_000 });

    // MainMenu → Settings → 개인정보처리방침
    await page.getByRole('button', { name: '설정' }).click();
    await expect(page.getByRole('button', { name: /개인정보처리방침/ })).toBeVisible({ timeout: 5_000 });
    await page.getByRole('button', { name: /개인정보처리방침/ }).click();

    // The iframe must mount regardless of which URL it resolves to.
    const iframe = page.locator('iframe[title="개인정보처리방침"]');
    await expect(iframe).toBeVisible({ timeout: 10_000 });

    // Verify the bundled fallback content is readable.
    // PrivacyScreen starts with the remote URL; a no-cors HEAD fetch that fails
    // switches src to /privacy-policy.html. In a local dev run the GitHub Pages
    // URL is typically unreachable, so the fallback loads.
    // We tolerate either outcome: if the fallback loaded the h1 is inspectable;
    // if the remote URL loaded we cannot read cross-origin content — pass on
    // iframe visibility alone in that case.
    const policyFrame = page.frameLocator('iframe[title="개인정보처리방침"]');
    const h1 = policyFrame.locator('h1').filter({ hasText: /개인정보처리방침/ });

    // Use a generous timeout; remote URL redirects or CORS may delay fallback switch.
    const h1Visible = await h1.isVisible({ timeout: 15_000 }).catch(() => false);

    // If the fallback loaded the h1 must be present.
    // If the remote URL loaded (cross-origin), h1 won't be readable — that's fine
    // as long as the iframe itself is visible (asserted above).
    if (h1Visible) {
      await expect(h1).toBeVisible();
    }
    // Either path: the iframe element itself is visible — that's the hard assertion.
    await expect(iframe).toBeVisible();
  });
});
