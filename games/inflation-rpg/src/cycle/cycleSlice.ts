import { create } from 'zustand';
import { AutoBattleController, type ControllerOptions } from './AutoBattleController';
import type { CycleResult } from './cycleEvents';

type CycleStatus = 'idle' | 'running' | 'ended';

interface CycleStoreState {
  status: CycleStatus;
  controller: AutoBattleController | null;
  result: CycleResult | null;
  start: (opts: ControllerOptions) => void;
  abandon: () => void;
  endOnBpExhausted: () => void;
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
    set({ status: 'ended', result: ctrl.getResult() });
  },
  endOnBpExhausted() {
    // Called by the rAF driver in CycleRunner when controller emits cycle_end.
    const ctrl = get().controller;
    if (!ctrl) return;
    set({ status: 'ended', result: ctrl.getResult() });
  },
  reset() {
    set({ status: 'idle', controller: null, result: null });
  },
}));
