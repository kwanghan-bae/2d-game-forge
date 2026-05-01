import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { RunState, MetaState, Screen, Equipment, AllocatedStats } from '../types';
import { STARTING_BP, onEncounter, onDefeat, onBossKill as bpOnBossKill } from '../systems/bp';
import {
  onBossKill as progressionOnBossKill,
  getBaseAbilityLevel,
  isHardModeUnlocked,
} from '../systems/progression';
import { addToInventory, removeFromInventory } from '../systems/equipment';
import { QUESTS, getQuestById } from '../data/quests';
import { attemptCraft } from '../systems/crafting';

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
  currentAreaId: 'village-entrance',
  currentDungeonId: null,
  currentFloor: 1,
  isHardMode: false,
  monstersDefeated: 0,
  goldThisRun: 0,
  currentStage: 1,
  dungeonRunMonstersDefeated: 0,
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
  bossDrop: (bossId: string, bpReward: number) => void;
  addEquipment: (item: Equipment) => void;
  sellEquipment: (itemId: string, price: number) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;
  buyEquipSlot: () => void;
  setCurrentArea: (areaId: string) => void;
  selectDungeon: (dungeonId: string | null) => void;
  setCurrentFloor: (floor: number) => void;
  advanceStage: () => void;
  resetDungeon: () => void;
  incrementDungeonKill: (monsterLevel: number) => void;
  incrementQuestProgress: (questId: string, by?: number) => void;
  completeQuest: (questId: string) => void;
  trackKill: (monsterId: string, regionId: string) => void;
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
  pendingStoryId: string | null;
  setPendingStory: (storyId: string | null) => void;
  // Stub — real impl in L3-4
  craft: (equipmentId: string) => boolean;
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
          },
          screen: s.run.currentDungeonId !== null ? 'dungeon-floors' : 'world-map',
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

      bossDrop: (bossId, bpReward) =>
        set((s) => {
          const normalKilled = s.run.isHardMode
            ? s.meta.normalBossesKilled
            : progressionOnBossKill(bossId, s.meta.normalBossesKilled, 9);
          const hardKilled = s.run.isHardMode
            ? progressionOnBossKill(bossId, s.meta.hardBossesKilled, 9)
            : s.meta.hardBossesKilled;
          const drGained = bpReward * 100;
          const stonesGained = bpReward;
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
            },
          };
        }),

      addEquipment: (item) => {
        set((s) => ({ meta: { ...s.meta, inventory: addToInventory(s.meta.inventory, item) } }));
        get().trackItemCollect(item.id);
      },

      sellEquipment: (itemId, price) =>
        set((s) => ({
          meta: {
            ...s.meta,
            inventory: removeFromInventory(s.meta.inventory, itemId),
            equippedItemIds: s.meta.equippedItemIds.filter((id) => id !== itemId),
            gold: s.meta.gold + price,
          },
        })),

      equipItem: (itemId) =>
        set((s) => {
          if (s.meta.equippedItemIds.length >= s.meta.equipSlotCount) return s;
          if (s.meta.equippedItemIds.includes(itemId)) return s;
          return { meta: { ...s.meta, equippedItemIds: [...s.meta.equippedItemIds, itemId] } };
        }),

      unequipItem: (itemId) =>
        set((s) => ({
          meta: { ...s.meta, equippedItemIds: s.meta.equippedItemIds.filter((id) => id !== itemId) },
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

      setCurrentArea: (areaId) => set((s) => ({ run: { ...s.run, currentAreaId: areaId } })),
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
        const drGained = Math.max(1, Math.round(monsterLevel * 0.5));
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

      trackKill: (monsterId, regionId) => {
        const state = get();
        for (const q of QUESTS) {
          if (q.type !== 'kill_count') continue;
          if (state.meta.questsCompleted.includes(q.id)) continue;
          const matchesMonster = q.target.monsterId === monsterId;
          const matchesRegion = q.target.monsterId === undefined && q.regionId === regionId;
          if (matchesMonster || matchesRegion) {
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

      craft: (equipmentId: string): boolean => {
        const state = get();
        const allItems = [
          ...state.meta.inventory.weapons,
          ...state.meta.inventory.armors,
          ...state.meta.inventory.accessories,
        ];
        const attempt = attemptCraft(allItems, equipmentId, state.meta.gold);
        if (!attempt.ok || !attempt.result || attempt.cost === undefined) return false;
        const result = attempt.result;
        const cost = attempt.cost;

        set(s => {
          // 1. Remove 3 instances of source from the matching slot inventory
          const slotKey: 'weapons' | 'armors' | 'accessories' =
            result.slot === 'weapon' ? 'weapons' :
            result.slot === 'armor' ? 'armors' : 'accessories';
          const sourceList = s.meta.inventory[slotKey];
          let removed = 0;
          const filtered = sourceList.filter(item => {
            if (removed < 3 && item.id === equipmentId) {
              removed++;
              return false;
            }
            return true;
          });

          // 2. Add result to the same slot
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
    }),
    {
      name: 'korea_inflation_rpg_save',
      version: 4,
      migrate: (persisted: unknown, fromVersion: number) => {
        const s = persisted as { meta?: Partial<MetaState>; run?: Partial<RunState> };
        if (fromVersion < 1) {
          s.meta = {
            equippedItemIds: [],
            equipSlotCount: 1,
            lastPlayedCharId: '',
            ...s.meta,
          };
        }
        // Inject defaults for dungeon stage fields added in content-layer2
        const run = s.run ?? {};
        s.run = {
          ...run,
          currentStage: run.currentStage ?? 1,
          dungeonRunMonstersDefeated: run.dungeonRunMonstersDefeated ?? 0,
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
        return s;
      },
      partialize: (state) => ({ meta: state.meta, run: state.run }),
    }
  )
);
