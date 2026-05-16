import { create } from 'zustand';
import { CycleControllerV2, type CycleControllerV2Opts } from './CycleControllerV2';
import { SagaStorage } from '../saga/SagaStorage';
import type { CycleSaga } from '../saga/SagaTypes';

type Status = 'idle' | 'running' | 'ended';

interface CycleStoreV2State {
  status: Status;
  controller: CycleControllerV2 | null;
  lastSaga: CycleSaga | null;
  start: (opts: CycleControllerV2Opts) => void;
  endCycle: () => void;
  reset: () => void;
}

export const useCycleStoreV2 = create<CycleStoreV2State>((set, get) => ({
  status: 'idle',
  controller: null,
  lastSaga: null,
  start(opts) {
    const ctrl = new CycleControllerV2(opts);
    set({ status: 'running', controller: ctrl, lastSaga: null });
  },
  endCycle() {
    const ctrl = get().controller;
    if (!ctrl) return;
    const saga = ctrl.finalize();
    SagaStorage.append(saga);
    set({ status: 'ended', lastSaga: saga });
  },
  reset() {
    set({ status: 'idle', controller: null, lastSaga: null });
  },
}));
