import { create } from 'zustand';
import { AutoBattleController, type ControllerOptions } from './AutoBattleController';
import type { CycleResult, CycleHistoryEntry } from './cycleEvents';
import { useGameStore } from '../store/gameStore';

type CycleStatus = 'idle' | 'running' | 'ended';

function persistCycleResult(result: CycleResult | null, seed: number): void {
  if (!result) return;
  const entry: CycleHistoryEntry = {
    endedAtMs: Date.now(),
    durationMs: result.durationMs,
    maxLevel: result.maxLevel,
    reason: result.reason,
    seed,
  };
  useGameStore.getState().recordCycleEnd(entry);
}

interface CycleStoreState {
  status: CycleStatus;
  controller: AutoBattleController | null;
  result: CycleResult | null;
  start: (opts: ControllerOptions) => void;
  abandon: () => void;
  markEnded: () => void;
  reset: () => void;
}

export const useCycleStore = create<CycleStoreState>((set, get) => ({
  status: 'idle',
  controller: null,
  result: null,
  start(opts) {
    const ctrl = new AutoBattleController(opts);
    set({ status: 'running', controller: ctrl, result: null });
  },
  abandon() {
    const ctrl = get().controller;
    if (!ctrl) return;
    ctrl.abandon();
    const result = ctrl.getResult();
    set({ status: 'ended', result });
    persistCycleResult(result, ctrl.getState().seed);
  },
  markEnded() {
    // Called by the rAF driver in CycleRunner when controller emits cycle_end.
    const ctrl = get().controller;
    if (!ctrl) return;
    const result = ctrl.getResult();
    set({ status: 'ended', result });
    persistCycleResult(result, ctrl.getState().seed);
  },
  reset() {
    set({ status: 'idle', controller: null, result: null });
  },
}));
