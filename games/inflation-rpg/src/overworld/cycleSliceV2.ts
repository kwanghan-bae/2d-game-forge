import { create } from 'zustand';
import { CycleControllerV2, type CycleControllerV2Opts } from './CycleControllerV2';
import { SagaStorage } from '../saga/SagaStorage';
import type { CycleSaga } from '../saga/SagaTypes';
import { goldFromCycle, spend } from '../meta/MetaProgression';
import { useGameStore } from '../store/gameStore';
import { rejuvenationCost } from '../hero/rejuvenation';
import { getRejuvDiscount, getDropChanceBonus, getAgingSpeedMul } from '../buff/buffEffects';

type Status = 'idle' | 'running' | 'ended';

interface CycleStoreV2State {
  status: Status;
  controller: CycleControllerV2 | null;
  lastSaga: CycleSaga | null;
  /** Gold awarded at the end of the most recent cycle. */
  lastGoldEarned: number;
  start: (opts: CycleControllerV2Opts) => void;
  endCycle: () => void;
  rejuvenateHero: (years: number) => void;
  reset: () => void;
}

export const useCycleStoreV2 = create<CycleStoreV2State>((set, get) => ({
  status: 'idle',
  controller: null,
  lastSaga: null,
  lastGoldEarned: 0,
  start(opts) {
    const ctrl = new CycleControllerV2({
      ...opts,
      getBuffSnapshot: opts.getBuffSnapshot ?? (() => {
        const meta = useGameStore.getState().meta;
        return {
          dropChanceBonus: getDropChanceBonus(meta),
          agingSpeedMul: getAgingSpeedMul(meta),
        };
      }),
    });
    set({ status: 'running', controller: ctrl, lastSaga: null, lastGoldEarned: 0 });
  },
  endCycle() {
    const ctrl = get().controller;
    if (!ctrl) return;
    const saga = ctrl.finalize();
    SagaStorage.append(saga);
    // Award sponsorGold based on cycle performance. Counters come from the
    // controller's running tally, not an equipment.length approximation.
    const hero = ctrl.getHero();
    const stats = ctrl.getStats();
    const gold = goldFromCycle({
      maxLevel: hero.level,
      kills: stats.kills,
      bossKills: stats.bossKills,
      drops: stats.drops,
    });
    // V1c-1 — auto-spend the freshly accrued gold using the 'balanced'
    // strategy so the live game's meta bonuses actually grow between cycles.
    // Headless sim drivers bypass this store entirely (they construct
    // CycleControllerV2 directly), so multi-scenario strategy comparison in
    // sim-scenarios.ts stays unaffected.
    useGameStore.setState(s => {
      const totalGold = (s.meta.sponsorGold ?? 0) + gold;
      const out = spend({
        gold: totalGold,
        atkBaseBonus: s.meta.atkBaseBonus ?? 0,
        hpBaseBonus: s.meta.hpBaseBonus ?? 0,
        strategy: 'balanced',
      });
      return {
        ...s,
        meta: {
          ...s.meta,
          sponsorGold: out.goldRemaining,
          atkBaseBonus: out.atkBaseBonus,
          hpBaseBonus: out.hpBaseBonus,
        },
      };
    });
    set({ status: 'ended', lastSaga: saga, lastGoldEarned: gold });
  },
  rejuvenateHero(years) {
    const ctrl = get().controller;
    if (!ctrl) return;
    const hero = ctrl.getHero();
    const meta = useGameStore.getState().meta;
    const baseCost = rejuvenationCost(hero.age);
    const discount = getRejuvDiscount(meta);
    const cost = Math.ceil(baseCost * (1 - discount));
    const light = meta.light ?? 0;
    if (light < cost) return;
    useGameStore.setState(s => ({
      ...s,
      meta: { ...s.meta, light: (s.meta.light ?? 0) - cost },
    }));
    hero.rejuvenate(years);
    ctrl.recordRejuvenation(years);
  },
  reset() {
    set({ status: 'idle', controller: null, lastSaga: null, lastGoldEarned: 0 });
  },
}));
