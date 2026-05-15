import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

/**
 * Build a v11 persist envelope with all MetaState fields populated.
 * Phase E (v11) adds relicStacks / mythicOwned / mythicEquipped / mythicSlotCap
 * / adsToday / adsLastResetTs on top of v10 (ascTree) and earlier shapes.
 *
 * Seeding at version === persist.version means no migration runs — every
 * required MetaState field must be present or hydration will crash.
 */
function seedV11Save(overrides: Record<string, unknown> = {}) {
  return {
    state: {
      meta: {
        // ---- Phase G (v10) baseline (copied from asctree.spec.ts) ----
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
        mythicOwned: [],
        mythicEquipped: [null, null, null, null, null],
        mythicSlotCap: 0,
        adsToday: 0,
        adsLastResetTs: Date.now(),
        ...overrides,
      },
      run: null,
      screen: 'town',
    },
    version: 11,
  };
}

test('Phase E — 보물고 진입 + 스택 유물 화면', async ({ page }) => {
  await page.goto(GAME_URL);
  await page.evaluate(([key, save]) => {
    localStorage.setItem(key as string, JSON.stringify(save));
  }, [SAVE_KEY, seedV11Save()] as const);
  await page.reload();

  // Navigate to 보물고 from Town
  await page.getByTestId('town-relics').click();

  // Relics screen renders heading "보물고" + all 10 stack-relic rows by KR name
  await expect(page.getByRole('heading', { name: '보물고' })).toBeVisible();
  await expect(page.getByText('전사의 깃발')).toBeVisible();
  await expect(page.getByTestId('relic-row')).toHaveCount(10);
  // 광고 시청 daily counter visible at 0/30
  await expect(page.getByTestId('ad-counter')).toContainText('0/30');
});

test('Phase E — cap-reached relic 의 광고 보기 disabled', async ({ page }) => {
  await page.goto(GAME_URL);
  const save = seedV11Save({
    relicStacks: {
      warrior_banner: 0, dokkaebi_charm: 0, gold_coin: 0, soul_pearl: 0,
      sands_of_time: 0, fate_dice: 0, moonlight_amulet: 0, eagle_arrow: 0,
      undead_coin: 1,                 // binary cap (value 1) — already at MAX
      feather_of_fate: 0,
    },
  });
  await page.evaluate(([key, savePayload]) => {
    localStorage.setItem(key as string, JSON.stringify(savePayload));
  }, [SAVE_KEY, save] as const);
  await page.reload();

  await page.getByTestId('town-relics').click();

  // Locate the 망자의 동전 row and confirm its "광고 보기" button is disabled
  const undeadRow = page.locator('[data-testid="relic-row"]').filter({ hasText: '망자의 동전' });
  await undeadRow.scrollIntoViewIfNeeded();
  await expect(undeadRow).toContainText('MAX');
  await expect(undeadRow.getByRole('button', { name: '광고 보기' })).toBeDisabled();
});
