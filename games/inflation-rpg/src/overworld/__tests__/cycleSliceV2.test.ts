import { describe, it, expect, beforeEach } from 'vitest';
import { useCycleStoreV2 } from '../cycleSliceV2';

describe('cycleSliceV2', () => {
  beforeEach(() => useCycleStoreV2.getState().reset());

  it('starts in idle', () => {
    expect(useCycleStoreV2.getState().status).toBe('idle');
    expect(useCycleStoreV2.getState().controller).toBeNull();
  });

  it('start transitions to running with controller', () => {
    useCycleStoreV2.getState().start({
      seed: 42,
      traits: [],
      bpMax: 30,
      heroHpMax: 100,
      heroAtkBase: 100,
    });
    expect(useCycleStoreV2.getState().status).toBe('running');
    expect(useCycleStoreV2.getState().controller).not.toBeNull();
  });

  it('endCycle finalizes saga and persists', () => {
    useCycleStoreV2.getState().start({
      seed: 42, traits: [], bpMax: 3, heroHpMax: 100, heroAtkBase: 100000,
    });
    // force end by exhausting
    for (let i = 0; i < 10; i++) {
      useCycleStoreV2.getState().controller!.handleArrival('enemy', `e${i}`);
    }
    useCycleStoreV2.getState().endCycle();
    expect(useCycleStoreV2.getState().status).toBe('ended');
    expect(useCycleStoreV2.getState().lastSaga).not.toBeNull();
  });

  it('reset clears everything', () => {
    useCycleStoreV2.getState().start({ seed: 1, traits: [], bpMax: 30, heroHpMax: 100, heroAtkBase: 100 });
    useCycleStoreV2.getState().reset();
    expect(useCycleStoreV2.getState().status).toBe('idle');
    expect(useCycleStoreV2.getState().controller).toBeNull();
    expect(useCycleStoreV2.getState().lastSaga).toBeNull();
  });
});
