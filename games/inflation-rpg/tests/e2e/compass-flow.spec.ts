import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

/**
 * Build a complete v12 persist envelope.
 * v12 adds compassOwned / dungeonMiniBossesCleared / dungeonMajorBossesCleared
 * on top of the full v11 shape. All fields must be present — seeding at
 * version === persist.version means no migration runs.
 */
function seedV12SaveWithCompass(opts: {
  plains_first?: boolean;
  forest_second?: boolean;
  omni?: boolean;
}) {
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
        adsLastResetTs: Date.now(),
        // ---- Phase Compass (v12) ----
        compassOwned: {
          plains_first:    !!opts.plains_first,
          plains_second:   false,
          forest_first:    false,
          forest_second:   !!opts.forest_second,
          mountains_first: false,
          mountains_second: false,
          omni:            !!opts.omni,
        },
        dungeonMiniBossesCleared: [],
        dungeonMajorBossesCleared: [],
      },
      run: null,
      screen: 'town',
    },
    version: 12,
  };
}

async function dismissTutorial(page: import('@playwright/test').Page) {
  const overlay = page.getByTestId('tutorial-overlay');
  if (await overlay.isVisible()) {
    await page.getByRole('button', { name: '건너뛰기' }).click();
    await overlay.waitFor({ state: 'hidden', timeout: 3000 });
  }
}

test.describe('Phase Compass — flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(GAME_URL);
    await page.evaluate((key) => localStorage.removeItem(key), SAVE_KEY);
  });

  test('default flow — single entry → modal → 입장', async ({ page }) => {
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10000 });
    await dismissTutorial(page);

    // Navigate Main → Town
    await page.getByRole('button', { name: /마을로/ }).click();

    // Town: single entry button, no per-dungeon shortcut buttons
    await expect(page.getByTestId('town-enter-dungeon')).toBeVisible();
    await expect(page.getByTestId('town-dungeon-plains')).toHaveCount(0);

    // Open modal
    await page.getByTestId('town-enter-dungeon').click();
    await expect(page.getByTestId('dungeon-pick-modal')).toBeVisible();
    await expect(page.getByTestId('pick-result')).toBeVisible();

    // No compass — free-mode button hidden
    await expect(page.getByTestId('pick-free-mode')).toHaveCount(0);

    // Enter
    await page.getByTestId('pick-enter').click();

    // class-select 화면 진입
    await expect(page.getByRole('button', { name: '화랑' }).first()).toBeVisible();
  });

  test('with second-tier compass — free-mode allows that one dungeon', async ({ page }) => {
    await page.evaluate(([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV12SaveWithCompass({ forest_second: true }))]);
    await page.reload();
    // Seed has screen: 'town' — skip main-menu navigation, wait for town directly.
    await page.waitForSelector('[data-testid="town-enter-dungeon"]', { timeout: 10000 });

    await page.getByTestId('town-enter-dungeon').click();
    await expect(page.getByTestId('pick-free-mode')).toBeVisible();

    await page.getByTestId('pick-free-mode').click();
    await expect(page.getByTestId('free-card-forest')).not.toBeDisabled();
    await expect(page.getByTestId('free-card-plains')).toBeDisabled();
    await expect(page.getByTestId('free-card-mountains')).toBeDisabled();

    await page.getByTestId('free-card-forest').click();
    // 자유 선택 → setPickedId → freeMode false → 다시 추첨 모드. enter 별도 클릭.
    await expect(page.getByTestId('pick-result')).toBeVisible();
    await page.getByTestId('pick-enter').click();

    await expect(page.getByRole('button', { name: '화랑' }).first()).toBeVisible();
  });

  test('with omni compass — free-mode allows all dungeons', async ({ page }) => {
    await page.evaluate(([key, save]) => localStorage.setItem(key as string, save as string),
      [SAVE_KEY, JSON.stringify(seedV12SaveWithCompass({ omni: true }))]);
    await page.reload();
    // Seed has screen: 'town' — skip main-menu navigation, wait for town directly.
    await page.waitForSelector('[data-testid="town-enter-dungeon"]', { timeout: 10000 });

    await page.getByTestId('town-enter-dungeon').click();
    await page.getByTestId('pick-free-mode').click();

    await expect(page.getByTestId('free-card-plains')).not.toBeDisabled();
    await expect(page.getByTestId('free-card-forest')).not.toBeDisabled();
    await expect(page.getByTestId('free-card-mountains')).not.toBeDisabled();
  });

  test('Relics screen — compass tab shows 7 rows', async ({ page }) => {
    await page.reload();
    await page.waitForSelector('.forge-screen', { timeout: 10000 });
    await dismissTutorial(page);

    await page.getByRole('button', { name: /마을로/ }).click();
    await page.getByTestId('town-relics').click();
    await page.getByTestId('relics-tab-compass').click();
    await expect(page.getByTestId('compass-tab')).toBeVisible();
    await expect(page.getByTestId('compass-row-plains_first')).toBeVisible();
    await expect(page.getByTestId('compass-row-omni')).toBeVisible();
    // 미보유 — hint 표시 검증
    await expect(page.getByTestId('compass-row-plains_first')).toContainText('floor 5 mini-boss');
  });
});
