// Cycle 129 — v25 → v26 migration test (N5 F1+F3)
//
// Test plan: docs/superpowers/evolution/cycle-127-test-plan.md §F1.7, F3.4, F3.5,
// EDGE.2, EDGE.3

import { describe, expect, it } from 'vitest';
import { runStoreMigration } from '../gameStore';

const v25Stub = (extra: Record<string, unknown> = {}) => ({
  meta: {
    inventory: { weapons: [], armors: [], accessories: [] },
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
    equippedItemIds: [],
    equipSlotCount: 1,
    lastPlayedCharId: '',
    questProgress: {},
    questsCompleted: [],
    regionsVisited: [],
    tutorialDone: false,
    tutorialStep: -1,
    musicVolume: 0.5,
    sfxVolume: 0.7,
    muted: false,
    dungeonProgress: {},
    dungeonFinalsCleared: [],
    pendingFinalClearedId: null,
    crackStones: 0,
    ascTier: 0,
    ascPoints: 0,
    ascTree: {},
    jp: {},
    jpEarnedTotal: {},
    jpCap: {},
    jpFirstKillAwarded: {},
    jpCharLvAwarded: {},
    skillLevels: {},
    ultSlotPicks: {},
    relicStacks: {},
    mythicOwned: [],
    mythicEquipped: [null, null, null, null, null],
    mythicSlotCap: 0,
    adsToday: 0,
    adsLastResetTs: 0,
    adsWatched: 0,
    compassOwned: {},
    dungeonMiniBossesCleared: [],
    dungeonMajorBossesCleared: [],
    adFreeOwned: false,
    lastIapTx: [],
    cycleHistory: [],
    traitsUnlocked: [],
    sagaHistory: [],
    sponsorGold: 0,
    atkBaseBonus: 0,
    hpBaseBonus: 0,
    light: 0,
    buffLevels: {},
    unlockedRealms: ['base'],
    eternalSaga: { events: [], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] },
    season: { current: 'spring', startedAtAge: 0 },
    hall: { entries: [] },
    ...extra,
  },
  run: {},
});

describe('Cycle 129 — migrateV25ToV26 (N5 F1+F3 defaults)', () => {
  /** F1.7 — v25 → v26: achievements / tokens / tokensRedeemed / seasonStartedAt 주입 */
  it('F1.7 v25 saved game → v26 default 주입 (achievements + tokens)', () => {
    const v25 = v25Stub();
    const migrated = runStoreMigration(v25, 25) as { meta: Record<string, unknown> };
    const m = migrated.meta;
    expect(m['achievements']).toBeDefined();
    const ach = m['achievements'] as { byId: Record<string, unknown> };
    expect(ach.byId['lv-10m-in-3-cycles']).toBeDefined();
    expect(ach.byId['npc-collect-4-uniques']).toBeDefined();
    expect(ach.byId['realm-conquest-6']).toBeDefined();
    expect(ach.byId['aging-master-10']).toBeDefined();
    expect(ach.byId['inflation-flash-100x']).toBeDefined();
    expect((ach as unknown as { last3MaxLevels: unknown }).last3MaxLevels).toEqual([]);
    expect((ach as unknown as { npcIdsCollected: unknown }).npcIdsCollected).toEqual([]);
    expect((ach as unknown as { naturalDeathsByRealm: unknown }).naturalDeathsByRealm).toEqual({});
    expect(m['tokens']).toBe(0);
    expect(m['tokensRedeemed']).toBe(0);
    expect(m['seasonStartedAt']).toBe(0);
  });

  /** F3.5 — 이미 v26 의 saved game → identity 보존 (이미 존재하는 token 잔액 유지) */
  it('F3.5 이미 v26 인 saved game → tokens 잔액 보존', () => {
    const v26 = v25Stub({
      achievements: {
        byId: {
          'lv-10m-in-3-cycles':   { id: 'lv-10m-in-3-cycles',   progress: 1, completed: false },
          'npc-collect-4-uniques':{ id: 'npc-collect-4-uniques',progress: 2, completed: false },
          'realm-conquest-6':     { id: 'realm-conquest-6',     progress: 0, completed: false },
          'aging-master-10':      { id: 'aging-master-10',      progress: 3, completed: false },
          'inflation-flash-100x': { id: 'inflation-flash-100x', progress: 0, completed: false },
        },
        last3MaxLevels: [5_000_000, 8_000_000],
        npcIdsCollected: ['npc-x'],
        naturalDeathsByRealm: { volcano: 3 },
      },
      tokens: 47,
      tokensRedeemed: 10,
      seasonStartedAt: 1_700_000_000_000,
    });
    const migrated = runStoreMigration(v26, 26) as { meta: Record<string, unknown> };
    const m = migrated.meta;
    expect(m['tokens']).toBe(47);
    expect(m['tokensRedeemed']).toBe(10);
    expect(m['seasonStartedAt']).toBe(1_700_000_000_000);
    expect((m['achievements'] as { last3MaxLevels: number[] }).last3MaxLevels).toEqual([5_000_000, 8_000_000]);
    expect((m['achievements'] as { npcIdsCollected: string[] }).npcIdsCollected).toEqual(['npc-x']);
  });

  /** EDGE.3 — `tokens` field 가 string (corrupted) → 0 fallback. crash 0. */
  it('EDGE.3 tokens: "corrupted" → 0 fallback', () => {
    const corrupted = v25Stub({ tokens: 'corrupted', tokensRedeemed: NaN, seasonStartedAt: 'bad' });
    const migrated = runStoreMigration(corrupted, 25) as { meta: Record<string, unknown> };
    expect(migrated.meta['tokens']).toBe(0);
    expect(migrated.meta['tokensRedeemed']).toBe(0);
    expect(migrated.meta['seasonStartedAt']).toBe(0);
  });

  /** EDGE.2 — achievements field 가 array (corrupted) → INITIAL fallback */
  it('EDGE.2 achievements: [] (corrupted array) → INITIAL fallback', () => {
    const corrupted = v25Stub({ achievements: [] });
    const migrated = runStoreMigration(corrupted, 25) as { meta: Record<string, unknown> };
    const ach = migrated.meta['achievements'] as { byId: Record<string, unknown> };
    expect(Array.isArray(ach)).toBe(false);
    expect(ach.byId['lv-10m-in-3-cycles']).toBeDefined();
  });

  /** EDGE.2 — achievements field 가 byId 결손 (corrupted) → INITIAL fallback */
  it('EDGE.2 achievements: { } (no byId) → INITIAL fallback', () => {
    const corrupted = v25Stub({ achievements: { last3MaxLevels: [], npcIdsCollected: [], naturalDeathsByRealm: {} } });
    const migrated = runStoreMigration(corrupted, 25) as { meta: Record<string, unknown> };
    const ach = migrated.meta['achievements'] as { byId: Record<string, unknown> };
    expect(ach.byId).toBeDefined();
    expect(ach.byId['lv-10m-in-3-cycles']).toBeDefined();
  });

  /** round-trip — migrate(v25 → v26) → JSON.stringify → parse → migrate(v26)
   *  의 deep equal. 기존 hero/sponsorGold 등 영속 field 보존 검증. */
  it('round-trip JSON.stringify/parse → migrate(26) identity', () => {
    const v25 = v25Stub({ gold: 12_345, sponsorGold: 678, sagaHistory: [{ cycleId: 'x' }] });
    const migrated1 = runStoreMigration(v25, 25);
    const json = JSON.parse(JSON.stringify(migrated1));
    const migrated2 = runStoreMigration(json, 26) as { meta: Record<string, unknown> };
    expect(migrated2.meta['gold']).toBe(12_345);
    expect(migrated2.meta['sponsorGold']).toBe(678);
    expect((migrated2.meta['sagaHistory'] as unknown[]).length).toBe(1);
    expect(migrated2.meta['tokens']).toBe(0);
  });
});
