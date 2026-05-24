import { create } from 'zustand';
import { CycleControllerV2, type CycleControllerV2Opts } from './CycleControllerV2';
import { SagaStorage } from '../saga/SagaStorage';
import type { CycleSaga } from '../saga/SagaTypes';
import { goldFromCycle, spend } from '../meta/MetaProgression';
import { useGameStore } from '../store/gameStore';
import { rejuvenationCost } from '../hero/rejuvenation';
import { getRejuvDiscount, getDropChanceBonus, getAgingSpeedMul, getFieldDiffThreshold } from '../buff/buffEffects';
import { computeFieldDamping } from '../zone/fieldDamping';
import { fieldLevelAtColumn } from '../zone/zoneNavigation';
import { findRealm } from '../data/realms';

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
    // V3-H B2: resolve which hero snapshot to use.
    //  - opts.heroSnapshot === undefined → check run.heroSnapshot (auto-resume from save).
    //  - opts.heroSnapshot === null → explicitly start fresh (clear override from CyclePrepV2).
    //  - opts.heroSnapshot is a HeroSnapshot object → use it directly.
    const savedSnapshot = opts.heroSnapshot === undefined
      ? (useGameStore.getState().run.heroSnapshot ?? null)
      : opts.heroSnapshot;
    const ctrl = new CycleControllerV2({
      ...opts,
      heroSnapshot: savedSnapshot,
      getBuffSnapshot: opts.getBuffSnapshot ?? (() => {
        const state = useGameStore.getState();
        const meta = state.meta;
        const ctrl = useCycleStoreV2.getState().controller;
        const hero = ctrl?.getHero();
        const heroLv = hero?.level ?? 1;
        const heroCol = (hero as unknown as { gridX?: number })?.gridX ?? 0;
        const currentRealm = state.run.currentRealmId;
        const fieldLv = fieldLevelAtColumn(currentRealm, heroCol);
        const buff6 = getFieldDiffThreshold(meta);
        return {
          dropChanceBonus: getDropChanceBonus(meta),
          agingSpeedMul: getAgingSpeedMul(meta),
          damping: computeFieldDamping(heroLv, fieldLv, buff6),
        };
      }),
      onBossKill: opts.onBossKill ?? ((current) => {
        const state = useGameStore.getState();
        const realm = findRealm(current);
        if (realm.nextRealm && !state.meta.unlockedRealms.includes(realm.nextRealm)) {
          state.unlockRealm(realm.nextRealm);
          return realm.nextRealm;
        }
        return null;
      }),
    });
    ctrl.setCurrentRealmId(useGameStore.getState().run.currentRealmId);
    ctrl.setUnlockedRealms(useGameStore.getState().meta.unlockedRealms);
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
    useGameStore.getState().recordSagaRejuvenation();
  },
  reset() {
    set({ status: 'idle', controller: null, lastSaga: null, lastGoldEarned: 0 });
  },
}));
