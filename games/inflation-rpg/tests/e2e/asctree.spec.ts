import { test, expect } from '@playwright/test';

const GAME_URL = '/games/inflation-rpg';
const SAVE_KEY = 'korea_inflation_rpg_save';

test('Phase G — Asc Tree 성좌 탭에서 노드 강화', async ({ page }) => {
  // 1. 빈 localStorage 로 진입 — preload page first so localStorage is on the right origin
  await page.goto(GAME_URL);

  // 2. v10 save 주입 — town 진입 가능한 최소 시드. ascPoints 50.
  await page.evaluate((key) => {
    const v10Save = {
      state: {
        meta: {
          ascPoints: 50,
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
          // Required fields for hydration without crash
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
        },
        run: null,
        screen: 'town',
      },
      version: 10,
    };
    localStorage.setItem(key, JSON.stringify(v10Save));
  }, SAVE_KEY);

  // 3. Reload → migrate / hydrate
  await page.reload();

  // 4. 마을 → 차원 제단 진입
  await page.getByTestId('town-ascension-altar').click();
  await expect(page.getByTestId('asctree-tab-tier')).toBeVisible();

  // 5. 성좌 탭
  await page.getByTestId('asctree-tab-tree').click();
  await expect(page.getByTestId('asctree-ap')).toContainText('50');

  // 6. hp_pct 노드 강화 (1 AP — nodeCost(0) = 1)
  await page.getByTestId('asctree-buy-hp_pct').click();
  await page.getByTestId('asctree-confirm-hp_pct').click();

  // 7. AP 49, lv 1
  await expect(page.getByTestId('asctree-ap')).toContainText('49');
  await expect(page.getByTestId('asctree-node-hp_pct')).toContainText('lv 1');
});
