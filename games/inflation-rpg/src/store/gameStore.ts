import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunState, MetaState, Screen, EquipmentInstance, AllocatedStats, AscTreeNodeId } from '../types';
import { EMPTY_RELIC_STACKS } from '../data/relics';
import { STARTING_BP, onEncounter, onDefeat, onBossKill as bpOnBossKill } from '../systems/bp';
import {
  onBossKill as progressionOnBossKill,
  getBaseAbilityLevel,
  isHardModeUnlocked,
} from '../systems/progression';
import { addToInventory, removeFromInventory } from '../systems/equipment';
import { QUESTS, getQuestById } from '../data/quests';
import { attemptCraft } from '../systems/crafting';
import { enhanceCost } from '../systems/enhance';
import { getEquipmentBase } from '../data/equipment';
import { rollModifiers, rerollCost, rerollOneSlot as rerollOneSlotFn, rerollAllSlots as rerollAllSlotsFn } from '../systems/modifiers';
import { jpCostToLevel, totalSkillLv, ultSlotsUnlocked } from '../systems/skillProgression';
import { getUltById } from '../data/jobskills';
import { ASC_TREE_NODES, EMPTY_ASC_TREE, nodeCost } from '../data/ascTree';
import { applyDropMult, applyMetaDropMult } from '../systems/economy';
import { rollMythicDrop, awardMilestoneMythic } from '../systems/mythics';
import { MILESTONE_TIERS } from '../data/mythics';

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
          screen: 'dungeon-floors',
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
          screen: 'game-over',
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
    }),
    {
      name: 'korea_inflation_rpg_save',
      version: 11,
      migrate: runStoreMigration,
      partialize: (state) => ({ meta: state.meta, run: state.run }),
    }
  )
);
