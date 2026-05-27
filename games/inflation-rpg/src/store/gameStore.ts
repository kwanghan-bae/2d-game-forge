import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunState, MetaState, Screen, EquipmentInstance, AllocatedStats, AscTreeNodeId, RelicId, MythicId, IapTransaction, BuffId } from '../types';
import type { CycleHistoryEntry } from '../cycle/cycleEvents';
import { EMPTY_RELIC_STACKS } from '../data/relics';
import { canWatchAd, startAdWatch, finishAdWatch, checkDailyReset } from '../systems/ads';
import { STARTING_BP, onEncounter, onDefeat, onBossKill as bpOnBossKill } from '../systems/bp';
import {
  onBossKill as progressionOnBossKill,
  getBaseAbilityLevel,
  isHardModeUnlocked,
} from '../systems/progression';
import { addToInventory, removeFromInventory } from '../systems/equipment';
import { addHallEntry as addHallEntryPure, toggleHallFavorite } from '../data/hallCapacity';
import { QUESTS, getQuestById } from '../data/quests';
import { attemptCraft } from '../systems/crafting';
import { enhanceCost } from '../systems/enhance';
import { getEquipmentBase } from '../data/equipment';
import { rollModifiers, rerollCost, rerollOneSlot as rerollOneSlotFn, rerollAllSlots as rerollAllSlotsFn } from '../systems/modifiers';
import { jpCostToLevel, totalSkillLv, ultSlotsUnlocked } from '../systems/skillProgression';
import { getUltById } from '../data/jobskills';
import { ASC_TREE_NODES, EMPTY_ASC_TREE, nodeCost } from '../data/ascTree';
import { applyDropMult, applyMetaDropMult } from '../systems/economy';
import { rollMythicDrop, awardMilestoneMythic, equipMythic, unequipMythic } from '../systems/mythics';
import { MILESTONE_TIERS } from '../data/mythics';
import { EMPTY_COMPASS_OWNED } from '../data/compass';
import { DUNGEONS } from '../data/dungeons';
import {
  awardMiniBossCompass as awardMiniBossCompassSystem,
  awardMajorBossCompass as awardMajorBossCompassSystem,
  canFreeSelect,
  pickRandomDungeon,
} from '../systems/compass';
import { computeMaxHp } from '../systems/playerHp';
import { BASE_TRAIT_IDS } from '../data/traits';
import { findBuff, nextStepCost, maxAffordable } from '../buff/catalog';
import { appendEvent, recordRejuvenation, recordRealmTransition } from '../saga/EternalSaga';
import { INITIAL_ACHIEVEMENTS } from '../data/achievementsTypes';
import { evaluateAchievements } from '../data/achievementsLogic';
import { ACHIEVEMENT_CATALOG, ALL_ACHIEVEMENT_IDS } from '../data/achievementsCatalog';
import { getTierUnlockBonus } from '../data/claimerTier';
import type { AchievementProgress } from '../data/achievementsTypes';

const INITIAL_ALLOCATED: AllocatedStats = { hp: 0, atk: 0, def: 0, agi: 0, luc: 0 };

export const SLOT_COSTS: Record<number, number> = {
  1: 5_000,
  2: 15_000,
  3: 50_000,
  4: 150_000,
  5: 500_000,
  6: 1_500_000,
  7: 5_000_000,
  8: 15_000_000,
  9: 50_000_000,
};

export const MAX_EQUIP_SLOTS = 10;

export const INITIAL_RUN: RunState = {
  characterId: '',
  level: 1,
  exp: 0,
  bp: STARTING_BP,
  statPoints: 0,
  allocated: INITIAL_ALLOCATED,
  currentDungeonId: null,
  currentFloor: 1,
  isHardMode: false,
  monstersDefeated: 0,
  goldThisRun: 0,
  currentStage: 1,
  dungeonRunMonstersDefeated: 0,
  featherUsed: 0,
  playerHp: null,
  // Phase V3-D — 현재 realm
  currentRealmId: 'base',
  // Phase V3-E — NPC roster
  npcs: [],
  // Phase V3-H B2 — hero snapshot (null = 새 cycle 시작)
  heroSnapshot: null,
};

export const INITIAL_META: MetaState = {
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
  // Phase B-3β1 — dungeon progress + finals
  dungeonProgress: {},
  dungeonFinalsCleared: [],
  pendingFinalClearedId: null,
  // Phase F-1 — Ascension
  crackStones: 0,
  ascTier: 0,
  ascPoints: 0,
  // Phase G — Ascension Tree
  ascTree: { ...EMPTY_ASC_TREE },
  // Phase F-2+3 — JP / Skill Progression
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
  // Phase E
  relicStacks: { ...EMPTY_RELIC_STACKS },
  mythicOwned: [],
  mythicEquipped: [null, null, null, null, null],
  mythicSlotCap: 0,
  adsToday: 0,
  adsLastResetTs: 0,
  adsWatched: 0,
  // Phase Compass — 차원 나침반
  compassOwned: { ...EMPTY_COMPASS_OWNED },
  dungeonMiniBossesCleared: [],
  dungeonMajorBossesCleared: [],
  // Phase 5 — Monetization
  adFreeOwned: false,
  lastIapTx: [],
  // Phase Sim-A — 사이클 히스토리
  cycleHistory: [],
  // Phase Sim-B — 해금된 trait 목록 (기본값 = 모든 base-tier traits)
  traitsUnlocked: [...BASE_TRAIT_IDS],
  // Phase V1a — 사가 히스토리
  sagaHistory: [],
  // Phase Sim-M (meta progression)
  sponsorGold: 0,
  atkBaseBonus: 0,
  hpBaseBonus: 0,
  // Phase V3-B — 빛 에너지 (회춘 비용)
  light: 0,
  // Phase V3-C — buff catalog 누적 Lv
  buffLevels: {},
  // Phase V3-D — 해금된 realm
  unlockedRealms: ['base'],
  // Phase V3-F — 무한 saga
  eternalSaga: { events: [], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] },
  // Phase V3-H — 계절
  season: { current: 'spring', startedAtAge: 0 },
  // Cycle 112-113 — Hall of Sagas
  hall: { entries: [] },
  // Cycle 129 N5 — F1 AchievementSystem + F3 Token Economy (v26 추가)
  achievements: INITIAL_ACHIEVEMENTS,
  tokens: 0,
  tokensRedeemed: 0,
  seasonStartedAt: 0,
};

interface GameStore {
  screen: Screen;
  run: RunState;
  meta: MetaState;
  setScreen: (s: Screen) => void;
  startRun: (characterId: string, isHardMode: boolean) => void;
  endRun: () => void;
  abandonRun: () => void;
  encounterMonster: (monsterLevel: number) => void;
  defeatRun: (monsterLevel: number) => void;
  gainLevels: (levels: number, spGained: number) => void;
  gainExp: (exp: number) => void;
  allocateSP: (stat: keyof AllocatedStats, amount: number) => void;
  bossDrop: (bossId: string, bpReward: number, bossType: 'mini' | 'major' | 'sub' | 'final') => void;
  addEquipment: (instance: EquipmentInstance) => void;
  sellEquipment: (instanceId: string, price: number) => void;
  equipItem: (instanceId: string) => void;
  unequipItem: (instanceId: string) => void;
  buyEquipSlot: () => void;
  selectDungeon: (dungeonId: string | null) => void;
  setCurrentFloor: (floor: number) => void;
  advanceStage: () => void;
  resetDungeon: () => void;
  incrementDungeonKill: (monsterLevel: number) => void;
  incrementQuestProgress: (questId: string, by?: number) => void;
  completeQuest: (questId: string) => void;
  trackKill: (monsterId: string) => void;
  trackBossDefeat: (bossId: string) => void;
  trackItemCollect: (equipmentId: string) => void;
  markRegionVisited: (regionId: string) => void;
  setTutorialStep: (index: number) => void;
  advanceTutorial: () => void;
  skipTutorial: () => void;
  restartTutorial: () => void;
  setVolumes: (music: number, sfx: number, muted: boolean) => void;
  gainDR: (amount: number) => void;
  gainEnhanceStones: (amount: number) => void;
  enhanceItem: (instanceId: string) => void;
  markDungeonProgress: (dungeonId: string, floor: number) => void;
  markFinalCleared: (dungeonId: string) => void;
  setPendingFinalCleared: (dungeonId: string | null) => void;
  // Phase F-1 — Ascension
  gainCrackStones: (amount: number) => void;
  canAscend: () => {
    ok: boolean;
    nextTier: number;
    cost: number;
    finalsRequired: number;
    finalsCleared: number;
    reason: 'finals' | 'stones' | null;
  };
  ascend: () => boolean;
  pendingStoryId: string | null;
  setPendingStory: (storyId: string | null) => void;
  // Stub — real impl in L3-4
  craft: (equipmentId: string) => boolean;
  // Phase D — Reroll actions
  rerollOneSlot: (instanceId: string, slot: 'weapon' | 'armor' | 'accessory', slotIdx: number) => void;
  rerollAllSlots: (instanceId: string, slot: 'weapon' | 'armor' | 'accessory') => void;
  // Phase F-3 — JP actions
  awardJpOnBossKill: (bossId: string, bossType: 'mini' | 'major' | 'sub' | 'final') => void;
  watchAdForJpCap: (charId: string) => void;
  // Phase E — Ad-watch relic stack
  watchAdForRelic: (relicId: RelicId) => void;
  // Phase E — Mythic equip/unequip
  equipMythicAction: (slotIdx: number, id: MythicId) => void;
  unequipMythicAction: (slotIdx: number) => void;
  awardJpOnCharLvMilestone: (charId: string) => void;
  levelUpSkill: (charId: string, skillId: string) => void;
  pickUltSlot: (charId: string, slotIndex: 0 | 1 | 2 | 3, ultSkillId: string | null) => void;
  // Phase G — Ascension Tree
  canBuyAscTreeNode: (id: AscTreeNodeId) => {
    ok: boolean;
    cost: number;
    currentLv: number;
    reason?: 'max' | 'ap';
  };
  buyAscTreeNode: (id: AscTreeNodeId) => boolean;
  // Phase Compass — store actions
  awardMiniBossCompass: (dungeonId: string) => void;
  awardMajorBossCompass: (dungeonId: string) => void;
  pickAndSelectDungeon: () => string;
  selectDungeonFree: (dungeonId: string) => void;
  // Phase Realms — playerHp lifecycle
  hydratePlayerHpIfNull: () => void;
  applyDamageToPlayer: (amount: number) => void;
  applyLifestealHeal: (amount: number) => void;
  // Phase 5 — Monetization store actions
  setAdFreeOwned: (owned: boolean) => void;
  recordIapTx: (tx: IapTransaction) => void;
  // Phase Sim-A — cycle history
  recordCycleEnd: (entry: CycleHistoryEntry) => void;
  // Phase V3-C — buff catalog spend
  buyBuff: (
    buffId: BuffId,
    count: 1 | 10 | 'max',
  ) => { ok: boolean; reason?: 'invalid' | 'zero' | 'insufficient' | 'oneshot'; count?: number; cost?: number };
  // Phase V3-D — realm unlock + transition
  unlockRealm: (realmId: import('../types').RealmId) => void;
  setCurrentRealm: (realmId: import('../types').RealmId) => void;
  // Phase V3-E — NPC spawn
  addNpc: (npc: import('../types').NpcEntity) => void;
  updateNpc: (instanceId: string, patch: Partial<import('../types').NpcEntity>) => void;
  // Phase V3-F — eternal saga
  recordSagaEvent: (event: import('../saga/SagaTypes').SagaEvent, chapter: import('../hero/HeroLifecycle').Chapter) => void;
  recordSagaRejuvenation: () => void;
  recordSagaRealmTransition: (from: import('../types').RealmId, to: import('../types').RealmId, atAge: number, chapter: import('../hero/HeroLifecycle').Chapter) => void;
  // Phase V3-H B2 — hero snapshot persist
  saveHeroSnapshot: (snapshot: import('../hero/HeroEntity').HeroSnapshot) => void;
  clearHeroSnapshot: () => void;
  // Cycle 113 N3 — Hall of Sagas
  addHallEntry: (entry: import('../data/hallTypes').HallEntry) => void;
  // Cycle 123 N3 — Hall favorited toggle
  toggleHallFavorite: (id: string) => void;
  // Cycle 151 N5 — F3 Token Economy. 5 token → 1 crackStone 환전 (cycle 151 재조정).
  //   ok=false reasons: 'invalid' (count<=0 or non-integer), 'insufficient' (잔액 부족).
  redeemTokens: (
    tokensToSpend: number,
  ) => { ok: true; tokenDelta: number; crackDelta: number } | { ok: false; reason: 'invalid' | 'insufficient' };
  // Cycle 131 N5 — evaluator only. cycleSliceV2.endCycle 에서 호출.
  //   evaluator 결과를 meta.achievements 에 저장. token grant 0, claimedAt set 0.
  //   (cycle 130 까지의 fused grant 는 cycle 131 에서 claimAchievement 액션으로 분리됨.)
  evaluateAndGrantAchievements: (saga: import('../saga/SagaTypes').CycleSaga, nowMs?: number) => void;
  // Cycle 131 N5 — manual claim 액션. completed && !claimedAt 인 entry 에서만 호출 가능.
  //   ok=false reasons: 'unknown-id' (catalog 에 없는 id), 'not-completed' (아직 미완료),
  //   'already-claimed' (이미 claim 됨). ok=true 시 tokens 누적 + claimedAt 박힘.
  claimAchievement: (
    id: import('../data/achievementsTypes').AchievementId,
    nowMs?: number,
  ) => { ok: true; tokenDelta: number } | { ok: false; reason: 'unknown-id' | 'not-completed' | 'already-claimed' };
}

// v8 → v9: 기존 EquipmentInstance 에 modifier 자동 굴림 + adsWatched 추가
export function migrateV8ToV9(persisted: unknown): unknown {
  const s = persisted as { meta?: Record<string, unknown> };
  if (!s.meta) return persisted;

  const migrateSlot = (items: unknown[], slot: 'weapon' | 'armor' | 'accessory'): unknown[] =>
    items.map((item) => {
      const it = item as Record<string, unknown>;
      if (Array.isArray(it.modifiers) && it.modifiers.length > 0) return it;
      const base = getEquipmentBase(it.baseId as string);
      if (!base) return { ...it, modifiers: it.modifiers ?? [] };
      const mods = rollModifiers(base.rarity, slot);
      return { ...it, modifiers: mods };
    });

  const m = s.meta as Record<string, unknown>;
  const inv = m.inventory as Record<string, unknown[]> | undefined;
  if (inv) {
    inv.weapons = migrateSlot(inv.weapons ?? [], 'weapon');
    inv.armors = migrateSlot(inv.armors ?? [], 'armor');
    inv.accessories = migrateSlot(inv.accessories ?? [], 'accessory');
  }

  // adsWatched 추가 (Phase E 대비)
  if (m.adsWatched === undefined) m.adsWatched = 0;

  return s;
}

// v13 → v14: Phase 5 — adFreeOwned + lastIapTx[] 추가
export function migrateV13ToV14(persisted: unknown): unknown {
  const s = persisted as { meta?: Record<string, unknown> };
  if (!s.meta) return persisted;

  const m = s.meta;
  if (typeof m['adFreeOwned'] !== 'boolean') m['adFreeOwned'] = false;
  if (!Array.isArray(m['lastIapTx'])) m['lastIapTx'] = [];

  return s;
}

// v18 → v19: Phase V3-B Eternal Hero — clean reset. All v18 cycle meta dropped.
// meta.light (새 에너지 자원) 을 0 으로 초기화.
export function migrateV18ToV19(persisted: unknown): unknown {
  const s = persisted as { meta?: Record<string, unknown> };
  if (!s.meta) return persisted;

  const m = s.meta;
  delete m['sponsorGold'];
  delete m['atkBaseBonus'];
  delete m['hpBaseBonus'];
  delete m['cycleHistory'];
  m['light'] = 0;

  return s;
}

// v19 → v20: Phase V3-C — meta.buffLevels (BuffId → level) 를 빈 객체로 초기화.
export function migrateV19ToV20(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted;
  const s = persisted as { meta?: Record<string, unknown> | null };
  if (!s.meta || typeof s.meta !== 'object') return persisted;
  const m = s.meta;
  if (m['buffLevels'] === undefined || typeof m['buffLevels'] !== 'object') {
    m['buffLevels'] = {};
  }
  return s;
}

// v20 → v21: Phase V3-D/E/F — unlockedRealms + eternalSaga + currentRealmId + npcs
export function migrateV20ToV21(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted;
  const s = persisted as { meta?: Record<string, unknown> | null; run?: Record<string, unknown> | null };
  if (s.meta && typeof s.meta === 'object') {
    if (!Array.isArray(s.meta['unlockedRealms'])) s.meta['unlockedRealms'] = ['base'];
    if (!s.meta['eternalSaga'] || typeof s.meta['eternalSaga'] !== 'object') {
      s.meta['eternalSaga'] = { events: [], chaptersByEra: {}, rejuvenationCount: 0, realmTransitions: [] };
    }
  }
  if (s.run && typeof s.run === 'object') {
    if (typeof s.run['currentRealmId'] !== 'string') s.run['currentRealmId'] = 'base';
    if (!Array.isArray(s.run['npcs'])) s.run['npcs'] = [];
  }
  return s;
}

// v21 → v22: Phase V3-H — season state default + heroSnapshot field
export function migrateV21ToV22(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted;
  const s = persisted as { meta?: Record<string, unknown> | null; run?: Record<string, unknown> | null };
  if (s.meta && typeof s.meta === 'object') {
    if (!s.meta['season'] || typeof s.meta['season'] !== 'object') {
      s.meta['season'] = { current: 'spring', startedAtAge: 0 };
    }
  }
  // B2: normalize heroSnapshot to null on old saves that don't have it
  if (s.run && typeof s.run === 'object' && s.run['heroSnapshot'] === undefined) {
    s.run['heroSnapshot'] = null;
  }
  return s;
}

// v22 → v23: Cycle-5 F2 — stale realm bug rescue. Force run.currentRealmId
// back to 'base' so existing players whose v22 save froze with a non-base
// realm id (sea/volcano/...) recover automatically on next load. Without
// this, the same pathfinder lock-out described in cycle-5 F1 would still
// trigger once on the very first post-update launch.
export function migrateV22ToV23(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted;
  const s = persisted as { run?: Record<string, unknown> | null };
  if (s.run && typeof s.run === 'object') {
    s.run['currentRealmId'] = 'base';
    if (!Array.isArray(s.run['npcs'])) s.run['npcs'] = [];
  }
  return s;
}

// v23 → v24: Cycle-7 S1 — sagaHistory stale 5세 entry retroactive cleanup.
// Cycle 5 의 stale realm bug 기간에 생성된 saga 카드는 hero col 1 에 갇혀
// 어떤 path 도 없이 즉시 '자연사' 처리되어 sagaHistory 에 5세 평민 LV 1
// 이벤트 0 entry 가 쌓였다. Cycle 6 P1 의 flat-snapshot fix 는 새 entry
// 만 정상화했고 기존 stale 카드는 그대로. 사용자가 saga book 을 처음
// 열었을 때 첫인상이 이런 stale 로 망쳐지지 않도록 retroactive 삭제.
//
// 4-AND 조건 (PRD S1 acceptance):
//   1. eventCount === 0 (chapters 전체 events + highlightEvents 합산 = 0)
//   2. finalAge ≤ 5 (hero.finalAge 우선, flat finalAge fallback)
//   3. deathCause === '자연사' (hero.cause 우선, flat deathCause fallback)
//   4. finalLevel ≤ 1 (hero.finalLevel 우선, flat finalLevel fallback)
//
// 조건이 매우 엄격해서 false positive risk 거의 0 — 정상 entry (예:
// finalLevel 2 인 운 좋은 levelUp 1 회) 는 보존된다. Defensive 처리:
// 비정상 shape (chapters undefined, hero missing 등) 는 통과시킨다.
export function migrateV23ToV24(persisted: unknown): unknown {
  if (typeof persisted !== 'object' || persisted === null) return persisted;
  const s = persisted as { meta?: Record<string, unknown> | null };
  if (!s.meta || typeof s.meta !== 'object') return s;
  const history = s.meta['sagaHistory'];
  if (!Array.isArray(history)) return s;

  const isStale = (entry: unknown): boolean => {
    if (typeof entry !== 'object' || entry === null) return false;
    const e = entry as {
      chapters?: unknown;
      highlightEvents?: unknown;
      hero?: { finalAge?: unknown; finalLevel?: unknown; cause?: unknown };
      finalAge?: unknown;
      finalLevel?: unknown;
      deathCause?: unknown;
    };

    // eventCount: chapters[].events.length 합산 + highlightEvents.length
    let eventCount = 0;
    if (Array.isArray(e.chapters)) {
      for (const c of e.chapters) {
        if (c && typeof c === 'object' && Array.isArray((c as { events?: unknown }).events)) {
          eventCount += ((c as { events: unknown[] }).events).length;
        }
      }
    }
    if (Array.isArray(e.highlightEvents)) eventCount += e.highlightEvents.length;
    if (eventCount !== 0) return false;

    // hero.* 우선, flat alias fallback (Cycle 6 P1 미적용 legacy entry 는
    // hero.* 만 존재하므로 nested 가 source of truth).
    const finalAge = typeof e.hero?.finalAge === 'number'
      ? e.hero.finalAge
      : (typeof e.finalAge === 'number' ? e.finalAge : undefined);
    if (typeof finalAge !== 'number' || finalAge > 5) return false;

    const cause = typeof e.hero?.cause === 'string'
      ? e.hero.cause
      : (typeof e.deathCause === 'string' ? e.deathCause : undefined);
    if (cause !== '자연사') return false;

    const finalLevel = typeof e.hero?.finalLevel === 'number'
      ? e.hero.finalLevel
      : (typeof e.finalLevel === 'number' ? e.finalLevel : undefined);
    if (typeof finalLevel !== 'number' || finalLevel > 1) return false;

    return true;
  };

  s.meta['sagaHistory'] = history.filter(entry => !isStale(entry));
  return s;
}

// Phase E — Mythic slot cap derived from ascension tier
//   tier 0 → 0 슬롯, tier 1-4 → 1 슬롯, tier 5-9 → 3 슬롯, tier 10+ → 5 슬롯
export function computeMythicSlotCap(tier: number): number {
  if (tier >= 10) return 5;
  if (tier >= 5) return 3;
  if (tier >= 1) return 1;
  return 0;
}

// Persist migration chain — exported for direct unit testing.
// IMPORTANT: 절대 early return 추가 금지. 모든 적용 가능한 `if (fromVersion <= N)` 블록을
// 순차 실행해야 v8 → v11 같은 다단계 체인이 깨지지 않는다. 함수 끝에서 단일 `return s` 만.
export function runStoreMigration(persisted: unknown, fromVersion: number): unknown {
  const s = persisted as { meta?: Partial<MetaState>; run?: (Partial<RunState> & { currentAreaId?: string }) };
  if (fromVersion < 1) {
    s.meta = {
      equippedItemIds: [],
      equipSlotCount: 1,
      lastPlayedCharId: '',
      ...s.meta,
    };
  }
  // Inject defaults for dungeon stage fields added in content-layer2
  // Phase E — featherUsed default for revive counter
  const run = s.run ?? {};
  s.run = {
    ...run,
    currentStage: run.currentStage ?? 1,
    dungeonRunMonstersDefeated: run.dungeonRunMonstersDefeated ?? 0,
    featherUsed: run.featherUsed ?? 0,
  } as RunState;
  // Inject defaults for quest fields added in content-layer3
  const meta = s.meta ?? {};
  s.meta = {
    ...meta,
    questProgress: meta.questProgress ?? {},
    questsCompleted: meta.questsCompleted ?? [],
    regionsVisited: meta.regionsVisited ?? [],
    tutorialDone: meta.tutorialDone ?? false,
    tutorialStep: meta.tutorialStep ?? -1,
    musicVolume: meta.musicVolume ?? 0.5,
    sfxVolume: meta.sfxVolume ?? 0.7,
    muted: meta.muted ?? false,
  } as MetaState;
  // Inject defaults for DR + enhanceStones added in phase-a-foundation
  if (fromVersion < 2 && s.meta) {
    s.meta.dr = s.meta.dr ?? 0;
    s.meta.enhanceStones = s.meta.enhanceStones ?? 0;
  }
  // Phase B-2 — currentDungeonId 추가
  if (fromVersion < 3 && s.run) {
    s.run.currentDungeonId = s.run.currentDungeonId ?? null;
  }
  // Phase B-3α — currentFloor 추가
  if (fromVersion < 4 && s.run) {
    s.run.currentFloor = s.run.currentFloor ?? 1;
  }
  // Phase B-3β1 — dungeonProgress / dungeonFinalsCleared / pendingFinalClearedId 추가
  if (fromVersion < 5 && s.meta) {
    s.meta.dungeonProgress = s.meta.dungeonProgress ?? {};
    s.meta.dungeonFinalsCleared = s.meta.dungeonFinalsCleared ?? [];
    s.meta.pendingFinalClearedId = s.meta.pendingFinalClearedId ?? null;
  }
  // Phase B-3β2 — currentAreaId 제거 (legacy world-map flow)
  if (fromVersion < 6 && s.run) {
    delete s.run.currentAreaId;
  }
  // Phase F-1 — Ascension fields
  if (fromVersion < 7 && s.meta) {
    s.meta.crackStones = s.meta.crackStones ?? 0;
    s.meta.ascTier = s.meta.ascTier ?? 0;
    s.meta.ascPoints = s.meta.ascPoints ?? 0;
  }
  // Phase F-2+3 — Equipment instance refactor + JP system (v8)
  if (fromVersion < 8 && s.meta) {
    const m = s.meta as any;

    // 1. inventory: Equipment[] → EquipmentInstance[]
    const migrateSlot = (items: any[]): any[] =>
      items.map((it: any) => ({
        instanceId: crypto.randomUUID(),
        baseId: it.id,
        enhanceLv: 0,
        modifiers: [],
      }));
    if (m.inventory) {
      m.inventory.weapons = migrateSlot(m.inventory.weapons ?? []);
      m.inventory.armors = migrateSlot(m.inventory.armors ?? []);
      m.inventory.accessories = migrateSlot(m.inventory.accessories ?? []);
    }

    // 2. equippedItemIds: baseId[] → instanceId[]
    const oldEquipped: string[] = m.equippedItemIds ?? [];
    const allInstances = [
      ...(m.inventory?.weapons ?? []),
      ...(m.inventory?.armors ?? []),
      ...(m.inventory?.accessories ?? []),
    ];
    const claimed = new Set<string>();
    const newEquipped: string[] = [];
    for (const oldBaseId of oldEquipped) {
      const found = allInstances.find(
        (inst: any) => inst.baseId === oldBaseId && !claimed.has(inst.instanceId)
      );
      if (found) {
        claimed.add(found.instanceId);
        newEquipped.push(found.instanceId);
      }
      // not found = orphan equipped — silently drop
    }
    m.equippedItemIds = newEquipped;

    // 3. JP / Skill 신규 필드 (CP3 T15 에서 INITIAL_META 도 갱신될 예정. 본 마이그레이션은 v8 진입을 위해 default 셋업)
    m.jp = m.jp ?? {};
    m.jpEarnedTotal = m.jpEarnedTotal ?? {};
    m.jpCap = m.jpCap ?? { hwarang: 50, mudang: 50, choeui: 50 };
    m.jpFirstKillAwarded = m.jpFirstKillAwarded ?? {};
    m.jpCharLvAwarded = m.jpCharLvAwarded ?? {};
    m.skillLevels = m.skillLevels ?? {};
    m.ultSlotPicks = m.ultSlotPicks ?? {
      hwarang: [null, null, null, null],
      mudang:  [null, null, null, null],
      choeui:  [null, null, null, null],
    };
  }
  // v8 → v9: EquipmentInstance 에 modifiers 자동 굴림
  if (fromVersion <= 8) {
    migrateV8ToV9(s);
  }
  // v9 → v10: Phase G — ascTree 초기 0 주입
  if (fromVersion <= 9 && s.meta) {
    s.meta.ascTree = s.meta.ascTree ?? { ...EMPTY_ASC_TREE };
  }
  // v10 → v11: Phase E — Relics + Mythic + Ads
  if (fromVersion <= 10 && s.meta) {
    const m = s.meta as MetaState;
    m.relicStacks    = m.relicStacks    ?? { ...EMPTY_RELIC_STACKS };
    m.mythicOwned    = m.mythicOwned    ?? [];
    m.mythicEquipped = m.mythicEquipped ?? [null, null, null, null, null];
    m.mythicSlotCap  = m.mythicSlotCap  ?? computeMythicSlotCap(m.ascTier ?? 0);
    m.adsToday       = m.adsToday       ?? 0;
    m.adsLastResetTs = m.adsLastResetTs ?? Date.now();
  }
  // v11 → v12: Phase Compass — compass owned + dungeon clear tracking
  if (fromVersion <= 11 && s.meta) {
    const m = s.meta as MetaState;
    m.compassOwned                = m.compassOwned                ?? { ...EMPTY_COMPASS_OWNED };
    m.dungeonMiniBossesCleared    = m.dungeonMiniBossesCleared    ?? [];
    m.dungeonMajorBossesCleared   = m.dungeonMajorBossesCleared   ?? [];
  }
  // v12 → v13: Phase Realms — expand compassOwned to 17 keys (5 new dungeons × 2)
  // Spread EMPTY_COMPASS_OWNED first (defaults false), then existing values override.
  // This preserves any pre-existing true keys (e.g. plains_first was true in v12).
  if (fromVersion <= 12 && s.meta) {
    const m = s.meta as MetaState;
    m.compassOwned = { ...EMPTY_COMPASS_OWNED, ...m.compassOwned };
  }
  // Phase Realms — v12 → v13 (run portion): init playerHp = null
  if (fromVersion <= 12 && s.run) {
    const r = s.run as RunState;
    if (r.playerHp === undefined) r.playerHp = null;
  }
  // v13 → v14: Phase 5 — adFreeOwned + lastIapTx[]
  if (fromVersion <= 13) {
    migrateV13ToV14(s);
  }
  // v14 → v15: Phase Sim-A — cycleHistory[]
  if (fromVersion <= 14 && s.meta) {
    if (!s.meta.cycleHistory) {
      s.meta.cycleHistory = [];
    }
  }
  // v15 → v16: Phase Sim-B — traitsUnlocked: TraitId[]
  if (fromVersion <= 15 && s.meta) {
    if (!s.meta.traitsUnlocked) {
      s.meta.traitsUnlocked = [...BASE_TRAIT_IDS];
    }
  }
  // v16 → v17: Phase V1a — sagaHistory: CycleSaga[]
  if (fromVersion <= 16 && s.meta) {
    if (!s.meta.sagaHistory) s.meta.sagaHistory = [];
  }
  // v17 → v18: Phase Sim-M — sponsorGold / atkBaseBonus / hpBaseBonus
  if (fromVersion <= 17 && s.meta) {
    if (s.meta.sponsorGold == null) s.meta.sponsorGold = 0;
    if (s.meta.atkBaseBonus == null) s.meta.atkBaseBonus = 0;
    if (s.meta.hpBaseBonus == null) s.meta.hpBaseBonus = 0;
  }
  // v18 → v19: Phase V3-B — clean reset + meta.light = 0
  if (fromVersion <= 18) {
    migrateV18ToV19(s);
  }
  // v19 → v20: Phase V3-C — buffLevels 초기화
  if (fromVersion <= 19) {
    migrateV19ToV20(s);
  }
  // v20 → v21: Phase V3-D/E/F — multi-zone + NPC + eternal saga
  if (fromVersion <= 20) {
    migrateV20ToV21(s);
  }
  // v21 → v22: Phase V3-H — season state default
  if (fromVersion <= 21) {
    migrateV21ToV22(s);
  }
  // v22 → v23: Cycle-5 F2 — stale realm bug rescue
  if (fromVersion <= 22) {
    migrateV22ToV23(s);
  }
  // v23 → v24: Cycle-7 S1 — sagaHistory stale 5세 entry retroactive cleanup
  if (fromVersion <= 23) {
    migrateV23ToV24(s);
  }
  // v24 → v25: Cycle 112-113 N3 — Hall of Sagas default
  if (fromVersion <= 24 && s.meta) {
    s.meta.hall = s.meta.hall ?? { entries: [] };
  }
  // v25 → v26: Cycle 129 N5 — F1 AchievementSystem + F3 Token Economy.
  // 인라인 default 주입 (cycle 122 패턴 — hall 의 v24→v25 와 동일 form).
  // EDGE.2/EDGE.3 의 부분 손상 가드도 본 블록 의무: 잘못된 타입 (string 등) →
  // INITIAL 로 fallback.
  if (fromVersion <= 25 && s.meta) {
    const m = s.meta as unknown as Record<string, unknown>;
    // achievements: 결손 / non-object / 형태 깨짐 → INITIAL.
    const ach = m['achievements'];
    if (
      !ach ||
      typeof ach !== 'object' ||
      Array.isArray(ach) ||
      typeof (ach as { byId?: unknown }).byId !== 'object'
    ) {
      // 5 starter 의 fresh progress (모듈 reference 회피, 리터럴 form).
      const freshById = {
        'lv-10m-in-3-cycles':   { id: 'lv-10m-in-3-cycles',   progress: 0, completed: false },
        'npc-collect-4-uniques':{ id: 'npc-collect-4-uniques',progress: 0, completed: false },
        'realm-conquest-6':     { id: 'realm-conquest-6',     progress: 0, completed: false },
        'aging-master-10':      { id: 'aging-master-10',      progress: 0, completed: false },
        'inflation-flash-100x': { id: 'inflation-flash-100x', progress: 0, completed: false },
      };
      m['achievements'] = {
        byId: freshById,
        last3MaxLevels: [],
        npcIdsCollected: [],
        naturalDeathsByRealm: {},
      };
    }
    // tokens: numeric, NaN/string 등은 0 으로 fallback.
    if (typeof m['tokens'] !== 'number' || !Number.isFinite(m['tokens'] as number)) {
      m['tokens'] = 0;
    }
    if (typeof m['tokensRedeemed'] !== 'number' || !Number.isFinite(m['tokensRedeemed'] as number)) {
      m['tokensRedeemed'] = 0;
    }
    if (typeof m['seasonStartedAt'] !== 'number' || !Number.isFinite(m['seasonStartedAt'] as number)) {
      m['seasonStartedAt'] = 0;
    }
  }
  return s;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      screen: 'main-menu',
      run: INITIAL_RUN,
      meta: INITIAL_META,

      setScreen: (screen) => set({ screen }),

      startRun: (characterId, isHardMode) =>
        set((s) => ({
          run: {
            ...INITIAL_RUN,
            characterId,
            isHardMode,
            currentDungeonId: s.run.currentDungeonId, // preserve dungeon selection from Town
            bp: STARTING_BP + s.meta.ascTree.bp_start,   // Phase G — bp_start node
          },
          screen: 'main-menu',
        })),

      endRun: () => {
        const { run, meta } = get();
        const bestRunLevel = Math.max(meta.bestRunLevel, run.level);
        const charId = run.characterId;
        const prevCharLv = meta.characterLevels[charId] ?? 0;
        set({
          run: INITIAL_RUN,
          meta: {
            ...meta,
            bestRunLevel,
            hardModeUnlocked: isHardModeUnlocked(bestRunLevel),
            characterLevels: { ...meta.characterLevels, [charId]: prevCharLv + 1 },
            lastPlayedCharId: charId,
          },
          screen: 'main-menu',
        });
        if (charId) get().awardJpOnCharLvMilestone(charId);
      },

      abandonRun: () => set({ run: INITIAL_RUN, screen: 'main-menu' }),

      encounterMonster: (monsterLevel) =>
        set((s) => ({ run: { ...s.run, bp: onEncounter(s.run.bp, monsterLevel) } })),

      defeatRun: (monsterLevel) =>
        set((s) => ({ run: { ...s.run, bp: onDefeat(s.run.bp, monsterLevel, s.run.isHardMode) } })),

      gainLevels: (levels, spGained) =>
        set((s) => ({
          run: { ...s.run, level: s.run.level + levels, statPoints: s.run.statPoints + spGained },
        })),

      gainExp: (exp) =>
        set((s) => ({ run: { ...s.run, exp: s.run.exp + exp } })),

      allocateSP: (stat, amount) =>
        set((s) => {
          if (s.run.statPoints < amount) return s;
          return {
            run: {
              ...s.run,
              statPoints: s.run.statPoints - amount,
              allocated: { ...s.run.allocated, [stat]: s.run.allocated[stat] + amount },
            },
          };
        }),

      bossDrop: (bossId, bpReward, bossType) => {
        set((s) => {
          const normalKilled = s.run.isHardMode
            ? s.meta.normalBossesKilled
            : progressionOnBossKill(bossId, s.meta.normalBossesKilled, 9);
          const hardKilled = s.run.isHardMode
            ? progressionOnBossKill(bossId, s.meta.hardBossesKilled, 9)
            : s.meta.hardBossesKilled;
          const dungLv = s.meta.ascTree.dungeon_currency;
          // DR has no ascTree drop node; applyMetaDropMult adds mythic+relic on top of dungLv scaling.
          const drGained = applyMetaDropMult(applyDropMult(bpReward * 100, 0.10, dungLv), 'dr', s.meta);
          // Spec §2 TODO-a: final boss drops 50 enhanceStones (격상 5 → 50)
          // Stones use 'dungeon_currency' kind — applyMetaDropMult already applies ascTree.dungeon_currency,
          // so call it directly (no chain) to avoid double-counting.
          const stonesGained = applyMetaDropMult(bossType === 'final' ? 50 : bpReward, 'dungeon_currency', s.meta);
          // Phase E T16 — final boss rolls a random mythic drop (30% base chance, unowned random_drop pool).
          // Non-final bosses do not roll. slotCap recomputed defensively for all bossTypes
          // (invariant: cap === computeMythicSlotCap(ascTier)).
          let newOwned = s.meta.mythicOwned;
          if (bossType === 'final') {
            const droppedId = rollMythicDrop(s.meta, Math.random);
            if (droppedId) {
              newOwned = [...newOwned, droppedId];
            }
          }
          const newSlotCap = computeMythicSlotCap(s.meta.ascTier);
          return {
            run: {
              ...s.run,
              bp: bpOnBossKill(s.run.bp, bpReward),
              dungeonRunMonstersDefeated: s.run.dungeonRunMonstersDefeated + 1,
              monstersDefeated: s.run.monstersDefeated + 1,
            },
            meta: {
              ...s.meta,
              normalBossesKilled: normalKilled,
              hardBossesKilled: hardKilled,
              baseAbilityLevel: getBaseAbilityLevel(normalKilled, hardKilled),
              dr: s.meta.dr + drGained,
              enhanceStones: s.meta.enhanceStones + stonesGained,
              mythicOwned: newOwned,
              mythicSlotCap: newSlotCap,
            },
          };
        });
        get().awardJpOnBossKill(bossId, bossType);
      },

      addEquipment: (instance) => {
        set((s) => ({ meta: { ...s.meta, inventory: addToInventory(s.meta.inventory, instance) } }));
        get().trackItemCollect(instance.baseId);
      },

      sellEquipment: (instanceId, price) =>
        set((s) => ({
          meta: {
            ...s.meta,
            inventory: removeFromInventory(s.meta.inventory, instanceId),
            equippedItemIds: s.meta.equippedItemIds.filter((id) => id !== instanceId),
            gold: s.meta.gold + price,
          },
        })),

      equipItem: (instanceId) =>
        set((s) => {
          if (s.meta.equippedItemIds.length >= s.meta.equipSlotCount) return s;
          if (s.meta.equippedItemIds.includes(instanceId)) return s;
          return { meta: { ...s.meta, equippedItemIds: [...s.meta.equippedItemIds, instanceId] } };
        }),

      unequipItem: (instanceId) =>
        set((s) => ({
          meta: { ...s.meta, equippedItemIds: s.meta.equippedItemIds.filter((id) => id !== instanceId) },
        })),

      buyEquipSlot: () =>
        set((s) => {
          const cost = SLOT_COSTS[s.meta.equipSlotCount];
          if (!cost || s.run.goldThisRun < cost) return s;
          return {
            run: { ...s.run, goldThisRun: s.run.goldThisRun - cost },
            meta: { ...s.meta, equipSlotCount: s.meta.equipSlotCount + 1 },
          };
        }),

      selectDungeon: (dungeonId) =>
        set((s) => ({ run: { ...s.run, currentDungeonId: dungeonId } })),
      setCurrentFloor: (floor) =>
        set((s) => ({ run: { ...s.run, currentFloor: floor } })),

      advanceStage: () => set((s) => ({
        run: { ...s.run, currentStage: s.run.currentStage + 1 },
      })),

      resetDungeon: () => set((s) => ({
        run: {
          ...s.run,
          currentStage: 1,
          dungeonRunMonstersDefeated: 0,
        },
      })),

      incrementDungeonKill: (monsterLevel) => set((s) => {
        const dungLv = s.meta.ascTree.dungeon_currency;
        // DR has no ascTree drop node; applyMetaDropMult adds mythic+relic on top of dungLv scaling.
        const drGained = applyMetaDropMult(
          applyDropMult(Math.max(1, Math.round(monsterLevel * 0.5)), 0.10, dungLv),
          'dr',
          s.meta,
        );
        return {
          run: {
            ...s.run,
            dungeonRunMonstersDefeated: s.run.dungeonRunMonstersDefeated + 1,
            monstersDefeated: s.run.monstersDefeated + 1,
          },
          meta: {
            ...s.meta,
            dr: s.meta.dr + drGained,
          },
        };
      }),

      incrementQuestProgress: (questId, by = 1) =>
        set((s) => {
          const current = s.meta.questProgress[questId] ?? 0;
          return {
            meta: {
              ...s.meta,
              questProgress: { ...s.meta.questProgress, [questId]: current + by },
            },
          };
        }),

      completeQuest: (questId) => {
        const state = get();
        if (state.meta.questsCompleted.includes(questId)) return;
        const quest = getQuestById(questId);
        if (!quest) return;
        const progress = state.meta.questProgress[questId] ?? 0;
        if (progress < quest.target.count) return; // 진행도 미충족

        // 보상 적용 + completed 마킹
        set((s) => {
          const gold = s.meta.gold + (quest.reward.gold ?? 0);
          // bp 보상은 run.bp 에. run 미진행 시 무시.
          let runBp = s.run.bp;
          if (quest.reward.bp && s.run.characterId) {
            runBp += quest.reward.bp;
          }
          // TODO(L3-4): quest.reward.equipmentId 장비 보상 inventory 추가
          return {
            meta: {
              ...s.meta,
              gold,
              questsCompleted: [...s.meta.questsCompleted, questId],
            },
            run: { ...s.run, bp: runBp },
          };
        });
      },

      trackKill: (monsterId) => {
        const state = get();
        for (const q of QUESTS) {
          if (q.type !== 'kill_count') continue;
          if (state.meta.questsCompleted.includes(q.id)) continue;
          if (q.target.monsterId === monsterId) {
            get().incrementQuestProgress(q.id);
          }
        }
      },

      trackBossDefeat: (bossId) => {
        const state = get();
        for (const q of QUESTS) {
          if (q.type !== 'boss_defeat') continue;
          if (q.target.bossId !== bossId) continue;
          if (state.meta.questsCompleted.includes(q.id)) continue;
          get().incrementQuestProgress(q.id);
        }
      },

      trackItemCollect: (equipmentId) => {
        const state = get();
        for (const q of QUESTS) {
          if (q.type !== 'item_collect') continue;
          if (q.target.equipmentId !== equipmentId) continue;
          if (state.meta.questsCompleted.includes(q.id)) continue;
          get().incrementQuestProgress(q.id);
        }
      },

      markRegionVisited: (regionId) => set((s) => {
        if (s.meta.regionsVisited.includes(regionId)) return s;
        return {
          meta: { ...s.meta, regionsVisited: [...s.meta.regionsVisited, regionId] },
        };
      }),

      pendingStoryId: null,
      setPendingStory: (storyId) => set({ pendingStoryId: storyId }),

      setTutorialStep: (index) => set((s) => ({ meta: { ...s.meta, tutorialStep: index } })),
      advanceTutorial: () => set((s) => {
        const next = s.meta.tutorialStep + 1;
        if (next >= 7) {
          return { meta: { ...s.meta, tutorialDone: true, tutorialStep: -1 } };
        }
        return { meta: { ...s.meta, tutorialStep: next } };
      }),
      skipTutorial: () => set((s) => ({ meta: { ...s.meta, tutorialDone: true, tutorialStep: -1 } })),
      restartTutorial: () => set((s) => ({ meta: { ...s.meta, tutorialDone: false, tutorialStep: 0 } })),
      setVolumes: (music, sfx, muted) => set((s) => ({ meta: { ...s.meta, musicVolume: music, sfxVolume: sfx, muted } })),

      gainDR: (amount) =>
        set((s) => ({ meta: { ...s.meta, dr: s.meta.dr + amount } })),

      gainEnhanceStones: (amount) =>
        set((s) => ({ meta: { ...s.meta, enhanceStones: s.meta.enhanceStones + amount } })),

      enhanceItem: (instanceId) =>
        set((s) => {
          const all = [
            ...s.meta.inventory.weapons,
            ...s.meta.inventory.armors,
            ...s.meta.inventory.accessories,
          ];
          const inst = all.find((i) => i.instanceId === instanceId);
          if (!inst) return s;
          const base = getEquipmentBase(inst.baseId);
          if (!base) return s;
          const cost = enhanceCost(base.rarity, inst.enhanceLv);
          if (s.meta.dr < cost.dr) return s;
          if (s.meta.enhanceStones < cost.stones) return s;

          const updateSlot = (list: EquipmentInstance[]) =>
            list.map((i) => (i.instanceId === instanceId ? { ...i, enhanceLv: i.enhanceLv + 1 } : i));

          return {
            meta: {
              ...s.meta,
              dr: s.meta.dr - cost.dr,
              enhanceStones: s.meta.enhanceStones - cost.stones,
              inventory: {
                weapons: updateSlot(s.meta.inventory.weapons),
                armors: updateSlot(s.meta.inventory.armors),
                accessories: updateSlot(s.meta.inventory.accessories),
              },
            },
          };
        }),

      markDungeonProgress: (dungeonId, floor) =>
        set((s) => {
          const prev = s.meta.dungeonProgress[dungeonId]?.maxFloor ?? 0;
          if (floor <= prev) return s;
          return {
            meta: {
              ...s.meta,
              dungeonProgress: {
                ...s.meta.dungeonProgress,
                [dungeonId]: { maxFloor: floor },
              },
            },
          };
        }),

      markFinalCleared: (dungeonId) =>
        set((s) => {
          if (s.meta.dungeonFinalsCleared.includes(dungeonId)) return s;
          return {
            meta: {
              ...s.meta,
              dungeonFinalsCleared: [...s.meta.dungeonFinalsCleared, dungeonId],
            },
          };
        }),

      setPendingFinalCleared: (dungeonId) =>
        set((s) => ({ meta: { ...s.meta, pendingFinalClearedId: dungeonId } })),

      // Phase F-1 — Ascension
      gainCrackStones: (amount) =>
        set((s) => ({ meta: { ...s.meta, crackStones: s.meta.crackStones + amount } })),

      canAscend: () => {
        const s = get();
        const nextTier = s.meta.ascTier + 1;
        const finalsRequired = nextTier + 2;
        const finalsCleared = s.meta.dungeonFinalsCleared.length;
        const ascAccelLv = s.meta.ascTree?.asc_accel ?? 0;
        const cost = Math.ceil((nextTier * nextTier) * (1 - 0.10 * ascAccelLv));
        if (finalsCleared < finalsRequired) {
          return { ok: false, nextTier, cost, finalsRequired, finalsCleared, reason: 'finals' };
        }
        if (s.meta.crackStones < cost) {
          return { ok: false, nextTier, cost, finalsRequired, finalsCleared, reason: 'stones' };
        }
        return { ok: true, nextTier, cost, finalsRequired, finalsCleared, reason: null };
      },

      ascend: () => {
        const check = get().canAscend();
        if (!check.ok) return false;
        const { nextTier, cost } = check;
        set((s) => {
          const equippedSet = new Set(s.meta.equippedItemIds);
          const keepEquipped = (list: EquipmentInstance[]) =>
            list.filter((inst) => equippedSet.has(inst.instanceId));
          let newMeta: MetaState = {
            ...s.meta,
            soulGrade: 0,
            dr: 0,
            enhanceStones: 0,
            characterLevels: {},
            normalBossesKilled: [],
            hardBossesKilled: [],
            baseAbilityLevel: 0,
            questProgress: {},
            questsCompleted: [],
            regionsVisited: [],
            dungeonProgress: {},
            pendingFinalClearedId: null,
            inventory: {
              weapons: keepEquipped(s.meta.inventory.weapons),
              armors: keepEquipped(s.meta.inventory.armors),
              accessories: keepEquipped(s.meta.inventory.accessories),
            },
            crackStones: s.meta.crackStones - cost,
            ascTier: nextTier,
            ascPoints: s.meta.ascPoints + nextTier,
            // Phase E — mythic slot cap derived from new tier (invariant: cap === computeMythicSlotCap(ascTier))
            mythicSlotCap: computeMythicSlotCap(nextTier),
          };
          // Phase E — milestone award (Tier 1/5/10/15/20)
          if (MILESTONE_TIERS.includes(nextTier)) {
            newMeta = awardMilestoneMythic(newMeta, nextTier);
          }
          return {
            run: INITIAL_RUN,
            screen: 'main-menu',
            meta: newMeta,
          };
        });
        return true;
      },

      canBuyAscTreeNode: (id) => {
        const s = get();
        const currentLv = s.meta.ascTree[id];
        const def = ASC_TREE_NODES[id];
        if (currentLv >= def.maxLevel) {
          return { ok: false, cost: 0, currentLv, reason: 'max' };
        }
        const cost = nodeCost(currentLv);
        if (s.meta.ascPoints < cost) {
          return { ok: false, cost, currentLv, reason: 'ap' };
        }
        return { ok: true, cost, currentLv };
      },

      buyAscTreeNode: (id) => {
        const check = get().canBuyAscTreeNode(id);
        if (!check.ok) return false;
        set((s) => ({
          meta: {
            ...s.meta,
            ascPoints: s.meta.ascPoints - check.cost,
            ascTree: {
              ...s.meta.ascTree,
              [id]: s.meta.ascTree[id] + 1,
            },
          },
        }));
        return true;
      },

      craft: (equipmentId: string): boolean => {
        const state = get();
        const allItems = [
          ...state.meta.inventory.weapons,
          ...state.meta.inventory.armors,
          ...state.meta.inventory.accessories,
        ];
        const sourceBaseId = equipmentId;
        const attempt = attemptCraft(allItems, sourceBaseId, state.meta.gold);
        if (!attempt.ok || !attempt.result || !attempt.resultBase || attempt.cost === undefined || !attempt.consumedInstanceIds) return false;
        const { result, resultBase, cost, consumedInstanceIds } = attempt;

        set(s => {
          const slotKey: 'weapons' | 'armors' | 'accessories' =
            resultBase.slot === 'weapon' ? 'weapons' :
            resultBase.slot === 'armor' ? 'armors' : 'accessories';
          const consumedSet = new Set(consumedInstanceIds);

          const filtered = s.meta.inventory[slotKey].filter(inst => !consumedSet.has(inst.instanceId));
          const newSlotList = [...filtered, result];

          return {
            meta: {
              ...s.meta,
              gold: s.meta.gold - cost,
              inventory: {
                ...s.meta.inventory,
                [slotKey]: newSlotList,
              },
            },
          };
        });

        return true;
      },

      // Phase F-3 — JP actions
      awardJpOnBossKill: (bossId, bossType) => set((s) => {
        const charId = s.run.characterId;
        if (!charId) return s;
        const baseJp = { mini: 1, major: 2, sub: 1, final: 5 }[bossType];
        const isFirst = !s.meta.jpFirstKillAwarded[charId]?.[bossId];
        const totalGain = isFirst ? baseJp * 2 : baseJp;

        const cap = s.meta.jpCap[charId] ?? 0;
        const earned = s.meta.jpEarnedTotal[charId] ?? 0;
        const headroom = Math.max(0, cap - earned);
        const granted = Math.min(totalGain, headroom);

        const nextFirstAwarded = isFirst
          ? {
              ...s.meta.jpFirstKillAwarded,
              [charId]: { ...(s.meta.jpFirstKillAwarded[charId] ?? {}), [bossId]: true as const },
            }
          : s.meta.jpFirstKillAwarded;

        if (granted === 0) {
          return { meta: { ...s.meta, jpFirstKillAwarded: nextFirstAwarded } };
        }

        return {
          meta: {
            ...s.meta,
            jp: { ...s.meta.jp, [charId]: (s.meta.jp[charId] ?? 0) + granted },
            jpEarnedTotal: { ...s.meta.jpEarnedTotal, [charId]: earned + granted },
            jpFirstKillAwarded: nextFirstAwarded,
          },
        };
      }),

      awardJpOnCharLvMilestone: (charId) => set((s) => {
        const charLv = s.meta.characterLevels[charId] ?? 0;
        const lastAwarded = s.meta.jpCharLvAwarded[charId] ?? 0;
        const milestones: Array<[number, number]> = [
          [50, 3], [100, 5], [200, 10], [500, 15], [1000, 20],
        ];

        let totalGain = 0;
        let newLastAwarded = lastAwarded;
        for (const [m, jpReward] of milestones) {
          if (charLv >= m && lastAwarded < m) {
            totalGain += jpReward;
            newLastAwarded = m;
          }
        }
        if (totalGain === 0 && newLastAwarded === lastAwarded) return s;

        const cap = s.meta.jpCap[charId] ?? 0;
        const earned = s.meta.jpEarnedTotal[charId] ?? 0;
        const headroom = Math.max(0, cap - earned);
        const granted = Math.min(totalGain, headroom);

        return {
          meta: {
            ...s.meta,
            jp: granted > 0
              ? { ...s.meta.jp, [charId]: (s.meta.jp[charId] ?? 0) + granted }
              : s.meta.jp,
            jpEarnedTotal: granted > 0
              ? { ...s.meta.jpEarnedTotal, [charId]: earned + granted }
              : s.meta.jpEarnedTotal,
            jpCharLvAwarded: { ...s.meta.jpCharLvAwarded, [charId]: newLastAwarded },
          },
        };
      }),

      watchAdForJpCap: (charId) => set((s) => ({
        meta: { ...s.meta, jpCap: { ...s.meta.jpCap, [charId]: (s.meta.jpCap[charId] ?? 0) + 50 } },
      })),

      // Phase E — Ad-watch relic stack: canWatchAd → startAdWatch → finishAdWatch.
      // 8s UI cooldown 은 UI 레벨에서 처리; 본 액션은 cooldown 종료 후 호출된다.
      watchAdForRelic: (relicId: RelicId) => {
        set((state) => {
          const now = Date.now();
          const refreshed = checkDailyReset(state.meta, now);
          const check = canWatchAd(refreshed, now);
          if (!check.ok) return { meta: refreshed };
          const { adRunId } = startAdWatch(refreshed, now);
          const { nextMeta } = finishAdWatch(refreshed, adRunId, relicId, now);
          return { meta: nextMeta };
        });
      },

      // Phase E — Mythic equip/unequip
      equipMythicAction: (slotIdx, id) =>
        set((state) => ({ meta: equipMythic(state.meta, slotIdx, id) })),
      unequipMythicAction: (slotIdx) =>
        set((state) => ({ meta: unequipMythic(state.meta, slotIdx) })),

      levelUpSkill: (charId, skillId) => set((s) => {
        const isUlt = !!getUltById(skillId);
        if (isUlt) {
          const slots = s.meta.ultSlotPicks[charId];
          if (!slots || !slots.includes(skillId)) return s;
        }
        const currLv = s.meta.skillLevels[charId]?.[skillId] ?? 0;
        const cost = jpCostToLevel(isUlt ? 'ult' : 'base', currLv);
        if ((s.meta.jp[charId] ?? 0) < cost) return s;
        return {
          meta: {
            ...s.meta,
            jp: { ...s.meta.jp, [charId]: (s.meta.jp[charId] ?? 0) - cost },
            skillLevels: {
              ...s.meta.skillLevels,
              [charId]: {
                ...(s.meta.skillLevels[charId] ?? {}),
                [skillId]: currLv + 1,
              },
            },
          },
        };
      }),

      pickUltSlot: (charId, slotIndex, ultSkillId) => set((s) => {
        if (ultSkillId === null) {
          const slots = (s.meta.ultSlotPicks[charId] ?? [null, null, null, null]).slice() as [string|null, string|null, string|null, string|null];
          slots[slotIndex] = null;
          return { meta: { ...s.meta, ultSlotPicks: { ...s.meta.ultSlotPicks, [charId]: slots } } };
        }
        const ult = getUltById(ultSkillId);
        if (!ult || ult.charId !== charId) return s;
        const totalLv = totalSkillLv(s.meta.skillLevels, charId);
        if (slotIndex >= ultSlotsUnlocked(totalLv)) return s;
        const currentSlots = s.meta.ultSlotPicks[charId] ?? [null, null, null, null];
        if (currentSlots.some((id, i) => id === ultSkillId && i !== slotIndex)) return s;
        const slots = currentSlots.slice() as [string|null, string|null, string|null, string|null];
        slots[slotIndex] = ultSkillId;
        return { meta: { ...s.meta, ultSlotPicks: { ...s.meta.ultSlotPicks, [charId]: slots } } };
      }),

      // Phase D — Reroll actions
      rerollOneSlot: (instanceId, slot, slotIdx) => {
        const state = get();
        const m = state.meta;
        const slotKey = slot === 'weapon' ? 'weapons' : slot === 'armor' ? 'armors' : 'accessories';
        const items = m.inventory[slotKey] as EquipmentInstance[];
        const item = items.find((it) => it.instanceId === instanceId);
        if (!item) return;
        const base = getEquipmentBase(item.baseId);
        if (!base) return;

        const cost = rerollCost(m.rerollCount ?? 0, 'one');
        if (m.dr < cost.dr || m.crackStones < cost.stones) return;

        const updated = rerollOneSlotFn(item, base.rarity, slot, slotIdx);
        set((s) => ({
          meta: {
            ...s.meta,
            dr: s.meta.dr - cost.dr,
            crackStones: s.meta.crackStones - cost.stones,
            rerollCount: (s.meta.rerollCount ?? 0) + 1,
            inventory: {
              ...s.meta.inventory,
              [slotKey]: (s.meta.inventory[slotKey] as EquipmentInstance[]).map(
                (it) => it.instanceId === instanceId ? updated : it
              ),
            },
          },
        }));
      },

      rerollAllSlots: (instanceId, slot) => {
        const state = get();
        const m = state.meta;
        const slotKey = slot === 'weapon' ? 'weapons' : slot === 'armor' ? 'armors' : 'accessories';
        const items = m.inventory[slotKey] as EquipmentInstance[];
        const item = items.find((it) => it.instanceId === instanceId);
        if (!item) return;
        const base = getEquipmentBase(item.baseId);
        if (!base) return;

        const cost = rerollCost(m.rerollCount ?? 0, 'all');
        if (m.dr < cost.dr || m.crackStones < cost.stones) return;

        const updated = rerollAllSlotsFn(item, base.rarity, slot);
        set((s) => ({
          meta: {
            ...s.meta,
            dr: s.meta.dr - cost.dr,
            crackStones: s.meta.crackStones - cost.stones,
            rerollCount: (s.meta.rerollCount ?? 0) + 1,
            inventory: {
              ...s.meta.inventory,
              [slotKey]: (s.meta.inventory[slotKey] as EquipmentInstance[]).map(
                (it) => it.instanceId === instanceId ? updated : it
              ),
            },
          },
        }));
      },

      // Phase Compass — store actions
      awardMiniBossCompass: (dungeonId) =>
        set((s) => {
          const patch = awardMiniBossCompassSystem(s.meta, dungeonId);
          return patch ? { meta: { ...s.meta, ...patch } } : {};
        }),

      awardMajorBossCompass: (dungeonId) =>
        set((s) => {
          const patch = awardMajorBossCompassSystem(s.meta, dungeonId);
          return patch ? { meta: { ...s.meta, ...patch } } : {};
        }),

      pickAndSelectDungeon: () => {
        const id = pickRandomDungeon(get().meta, DUNGEONS);
        get().selectDungeon(id);
        return id;
      },

      selectDungeonFree: (dungeonId) => {
        if (!canFreeSelect(get().meta, dungeonId)) {
          console.warn('selectDungeonFree denied: no compass for', dungeonId);
          return;
        }
        get().selectDungeon(dungeonId);
      },

      // Phase Realms — playerHp lifecycle actions
      hydratePlayerHpIfNull: () => set((s) => {
        if (!s.run) return {};
        if (s.run.playerHp !== null) return {};
        const maxHp = computeMaxHp(s.run, s.meta);
        return { run: { ...s.run, playerHp: maxHp } };
      }),

      applyDamageToPlayer: (amount: number) => set((s) => {
        if (!s.run || s.run.playerHp === null) return {};
        const next = Math.max(0, s.run.playerHp - amount);
        return { run: { ...s.run, playerHp: next } };
      }),

      applyLifestealHeal: (amount: number) => set((s) => {
        if (!s.run || s.run.playerHp === null) return {};
        const maxHp = computeMaxHp(s.run, s.meta);
        const next = Math.min(maxHp, s.run.playerHp + amount);
        return { run: { ...s.run, playerHp: next } };
      }),

      // Phase 5 — Monetization store actions
      setAdFreeOwned: (owned: boolean) =>
        set((s) => ({ meta: { ...s.meta, adFreeOwned: owned } })),

      recordIapTx: (tx: IapTransaction) =>
        set((s) => ({
          meta: {
            ...s.meta,
            lastIapTx: [...s.meta.lastIapTx, tx].slice(-50),
          },
        })),

      // Phase Sim-A — cycle history, capped to last 50 entries
      recordCycleEnd: (entry: CycleHistoryEntry) =>
        set((s) => ({
          meta: {
            ...s.meta,
            cycleHistory: [...s.meta.cycleHistory, entry].slice(-50),
          },
        })),

      buyBuff(buffId, count) {
        const meta = get().meta;
        const def = findBuff(buffId);
        if (def.isOneShot) return { ok: false, reason: 'oneshot' };
        const lv = meta.buffLevels?.[buffId] ?? 0;
        const light = meta.light ?? 0;
        const n = count === 'max' ? maxAffordable(def, lv, light) : count;
        if (typeof n !== 'number' || n <= 0) return { ok: false, reason: 'zero' };
        const cost = nextStepCost(def, lv, n);
        if (light < cost) return { ok: false, reason: 'insufficient' };
        set(s => ({
          ...s,
          meta: {
            ...s.meta,
            light: (s.meta.light ?? 0) - cost,
            buffLevels: { ...(s.meta.buffLevels ?? {}), [buffId]: lv + n },
          },
        }));
        return { ok: true, count: n, cost };
      },

      unlockRealm(realmId) {
        set(s => {
          if (s.meta.unlockedRealms.includes(realmId)) return s;
          return { ...s, meta: { ...s.meta, unlockedRealms: [...s.meta.unlockedRealms, realmId] } };
        });
      },

      setCurrentRealm(realmId) {
        set(s => ({ ...s, run: { ...s.run, currentRealmId: realmId } }));
      },

      addNpc(npc) {
        set(s => ({ ...s, run: { ...s.run, npcs: [...s.run.npcs, npc] } }));
      },
      updateNpc(instanceId, patch) {
        set(s => ({ ...s, run: { ...s.run, npcs: s.run.npcs.map(n => n.instanceId === instanceId ? { ...n, ...patch } : n) } }));
      },
      recordSagaEvent(event, chapter) {
        set(s => ({ ...s, meta: { ...s.meta, eternalSaga: appendEvent(s.meta.eternalSaga, event, chapter) } }));
      },
      recordSagaRejuvenation() {
        set(s => ({ ...s, meta: { ...s.meta, eternalSaga: recordRejuvenation(s.meta.eternalSaga) } }));
      },
      recordSagaRealmTransition(from, to, atAge, chapter) {
        set(s => ({ ...s, meta: { ...s.meta, eternalSaga: recordRealmTransition(s.meta.eternalSaga, from, to, atAge, chapter) } }));
      },
      // Phase V3-H B2 — hero snapshot persist/clear
      saveHeroSnapshot(snapshot) {
        set(s => ({ ...s, run: { ...s.run, heroSnapshot: snapshot } }));
      },
      clearHeroSnapshot() {
        set(s => ({ ...s, run: { ...s.run, heroSnapshot: null } }));
      },
      addHallEntry(entry) {
        // Cycle 113 N3 — top-N union dedup. Pure logic in hallCapacity.ts.
        set(s => {
          const nextHall = addHallEntryPure(s.meta.hall ?? { entries: [] }, entry);
          return { ...s, meta: { ...s.meta, hall: nextHall } };
        });
      },
      toggleHallFavorite(id) {
        // Cycle 123 N3 — favorited toggle.
        set(s => {
          const nextHall = toggleHallFavorite(s.meta.hall ?? { entries: [] }, id);
          return { ...s, meta: { ...s.meta, hall: nextHall } };
        });
      },

      // Cycle 129 N5 — F3 Token Economy. 환전 비율 10:1 (PRD §F3).
      // PRD 의 트리거 invariant: token 발생 = achievement 진행도만. 본 action 은
      // 환전 (consume) 만 — token 발생은 evaluateAndGrantAchievements 가 소유.
      redeemTokens(tokensToSpend) {
        // F3.3 잔액 음수 가드 + invalid 가드. 정수 + 양수만 허용.
        if (
          typeof tokensToSpend !== 'number' ||
          !Number.isFinite(tokensToSpend) ||
          tokensToSpend <= 0 ||
          !Number.isInteger(tokensToSpend)
        ) {
          return { ok: false, reason: 'invalid' };
        }
        const meta = get().meta;
        const bal = meta.tokens ?? 0;
        if (bal < tokensToSpend) {
          return { ok: false, reason: 'insufficient' };
        }
        // Cycle 151: 10:1 → 5:1, Cycle 157: 5:1 → 3:1 환전 비율 재조정
        // (level-designer #2 — realistic 1.56% sub-margin → 2.59% boost).
        // 3 token → 1 crackStone. tokensToSpend 의 정수 나눗셈. 잔여 (tokensToSpend % 3)
        // 은 consume 안 함.
        const crackDelta = Math.floor(tokensToSpend / 3);
        const actualConsume = crackDelta * 3;
        if (crackDelta <= 0) {
          // 3 미만 호출 시 환전 0 — caller 에 명확한 reject.
          return { ok: false, reason: 'insufficient' };
        }
        set(s => ({
          ...s,
          meta: {
            ...s.meta,
            tokens: (s.meta.tokens ?? 0) - actualConsume,
            tokensRedeemed: (s.meta.tokensRedeemed ?? 0) + actualConsume,
            crackStones: (s.meta.crackStones ?? 0) + crackDelta,
          },
        }));
        return { ok: true, tokenDelta: -actualConsume, crackDelta };
      },

      // Cycle 131 N5 — evaluator only. claim 책임은 claimAchievement 액션으로 분리.
      // cycleSliceV2.endCycle 의 addHallEntry 직후 호출 hook. evaluator 의 next 를
      // meta.achievements 에 저장만 한다. tokens delta = 0, claimedAt set = 0.
      // 사용자가 SeasonPassScreen 의 claim button 으로 명시 호출해야 토큰이 누적된다.
      evaluateAndGrantAchievements(saga, nowMs) {
        const at = typeof nowMs === 'number' ? nowMs : Date.now();
        set(s => {
          const prior = s.meta.achievements ?? INITIAL_ACHIEVEMENTS;
          const next = evaluateAchievements({ saga, prior, nowMs: at });
          return {
            ...s,
            meta: {
              ...s.meta,
              achievements: next,
            },
          };
        });
      },

      // Cycle 131 N5 — manual claim. completed && !claimedAt 인 entry 만 통과.
      claimAchievement(id, nowMs) {
        if (!ALL_ACHIEVEMENT_IDS.includes(id)) {
          return { ok: false, reason: 'unknown-id' };
        }
        const state = get();
        const entry = state.meta.achievements?.byId[id];
        if (!entry || !entry.completed) {
          return { ok: false, reason: 'not-completed' };
        }
        if (entry.claimedAt !== undefined) {
          return { ok: false, reason: 'already-claimed' };
        }
        const at = typeof nowMs === 'number' ? nowMs : Date.now();
        const baseTokenDelta = ACHIEVEMENT_CATALOG[id].reward.tokens;
        // Cycle 153: tier 진입 보너스 합산. countBefore = 현재 누적,
        //   countAfter = +1 후. 같은 tier 안 0, 진입 시 TIER_UNLOCK_REWARD.
        const countBefore = state.meta.totalClaimsCount ?? 0;
        const tierBonusResult = getTierUnlockBonus(countBefore, countBefore + 1);
        const tokenDelta = baseTokenDelta + tierBonusResult.bonus;
        set(s => {
          const ach = s.meta.achievements ?? INITIAL_ACHIEVEMENTS;
          return {
            ...s,
            meta: {
              ...s.meta,
              achievements: {
                ...ach,
                byId: {
                  ...ach.byId,
                  [id]: { ...ach.byId[id], claimedAt: at },
                },
              },
              tokens: (s.meta.tokens ?? 0) + tokenDelta,
              totalClaimsCount: (s.meta.totalClaimsCount ?? 0) + 1,
            },
          };
        });
        return { ok: true, tokenDelta };
      },
    }),
    {
      name: 'korea_inflation_rpg_save',
      version: 26,  // cycle 129 — N5 F1+F3 (achievements + tokens + seasonStartedAt)
      migrate: runStoreMigration,
      partialize: (state) => ({ meta: state.meta, run: state.run }),
    }
  )
);
