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

export const INITIAL_RUN: RunState = {
  characterId: '',
  level: 1,
  exp: 0,
  bp: STARTING_BP,
  statPoints: 0,
  allocated: INITIAL_ALLOCATED,
  currentAreaId: 'village-entrance',
  isHardMode: false,
  monstersDefeated: 0,
  goldThisRun: 0,
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
  equippedItemIds: [],
  equipSlotCount: 1,
  lastPlayedCharId: '',
};

interface GameStore {
  screen: Screen;
  run: RunState;
  meta: MetaState;
  setScreen: (s: Screen) => void;
  startRun: (characterId: string, isHardMode: boolean) => void;
  endRun: () => void;
  abandonRun: () => void;
  encounterMonster: () => void;
  defeatRun: () => void;
  gainLevels: (levels: number, spGained: number) => void;
  gainExp: (exp: number) => void;
  allocateSP: (stat: keyof AllocatedStats, amount: number) => void;
  bossDrop: (bossId: string, bpReward: number) => void;
  addEquipment: (item: Equipment) => void;
  sellEquipment: (itemId: string, price: number) => void;
  equipItem: (itemId: string) => void;
  unequipItem: (itemId: string) => void;
  buyEquipSlot: () => void;
}

export const useGameStore = create<GameStore>()(
  persist(
    (set, get) => ({
      screen: 'main-menu',
      run: INITIAL_RUN,
      meta: INITIAL_META,

      setScreen: (screen) => set({ screen }),

      startRun: (characterId, isHardMode) =>
        set({ run: { ...INITIAL_RUN, characterId, isHardMode }, screen: 'world-map' }),

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

      encounterMonster: () =>
        set((s) => ({ run: { ...s.run, bp: onEncounter(s.run.bp) } })),

      defeatRun: () =>
        set((s) => ({ run: { ...s.run, bp: onDefeat(s.run.bp, s.run.isHardMode) } })),

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
          return {
            run: { ...s.run, bp: bpOnBossKill(s.run.bp, bpReward) },
            meta: {
              ...s.meta,
              normalBossesKilled: normalKilled,
              hardBossesKilled: hardKilled,
              baseAbilityLevel: getBaseAbilityLevel(normalKilled, hardKilled),
            },
          };
        }),

      addEquipment: (item) =>
        set((s) => ({ meta: { ...s.meta, inventory: addToInventory(s.meta.inventory, item) } })),

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
    }),
    {
      name: 'korea_inflation_rpg_save',
      partialize: (state) => ({ meta: state.meta, run: state.run }),
    }
  )
);
