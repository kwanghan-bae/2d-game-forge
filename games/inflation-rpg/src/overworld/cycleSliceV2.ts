import { create } from 'zustand';
import { CycleControllerV2, type CycleControllerV2Opts } from './CycleControllerV2';
import { SagaStorage } from '../saga/SagaStorage';
import type { CycleSaga } from '../saga/SagaTypes';
import { goldFromCycle } from '../meta/MetaProgression';
import { useGameStore } from '../store/gameStore';

type Status = 'idle' | 'running' | 'ended';

interface CycleStoreV2State {
  status: Status;
  controller: CycleControllerV2 | null;
  lastSaga: CycleSaga | null;
  /** Gold awarded at the end of the most recent cycle. */
  lastGoldEarned: number;
  start: (opts: CycleControllerV2Opts) => void;
  endCycle: () => void;
  reset: () => void;
}

export const useCycleStoreV2 = create<CycleStoreV2State>((set, get) => ({
  status: 'idle',
  controller: null,
  lastSaga: null,
  lastGoldEarned: 0,
  start(opts) {
    const ctrl = new CycleControllerV2(opts);
    set({ status: 'running', controller: ctrl, lastSaga: null, lastGoldEarned: 0 });
  },
  endCycle() {
    const ctrl = get().controller;
    if (!ctrl) return;
    const saga = ctrl.finalize();
    SagaStorage.append(saga);
    // Award sponsorGold based on cycle performance.
    const hero = ctrl.getHero();
    const gold = goldFromCycle({
      maxLevel: hero.level,
      kills: hero.equipment.length, // approximation; sim-cycle-v2 has precise counters
      bossKills: 0,
      drops: hero.equipment.length,
    });
    useGameStore.setState(s => ({
      ...s,
      meta: { ...s.meta, sponsorGold: (s.meta.sponsorGold ?? 0) + gold },
    }));
    set({ status: 'ended', lastSaga: saga, lastGoldEarned: gold });
  },
  reset() {
    set({ status: 'idle', controller: null, lastSaga: null, lastGoldEarned: 0 });
  },
}));
