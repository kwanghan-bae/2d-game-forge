import { describe, it, expect, beforeEach } from 'vitest';
import { useCycleStore } from '../cycleSlice';

describe('cycleSlice', () => {
  beforeEach(() => {
    useCycleStore.getState().reset();
  });

  it('starts in idle status', () => {
    expect(useCycleStore.getState().status).toBe('idle');
    expect(useCycleStore.getState().controller).toBeNull();
  });

  it('start() transitions to running and creates controller', () => {
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 5, heroHpMax: 100, heroAtkBase: 10 },
      seed: 42,
    });
    expect(useCycleStore.getState().status).toBe('running');
    expect(useCycleStore.getState().controller).not.toBeNull();
  });

  it('abandon() transitions to ended with result populated', () => {
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 5, heroHpMax: 100, heroAtkBase: 10 },
      seed: 42,
    });
    useCycleStore.getState().abandon();
    expect(useCycleStore.getState().status).toBe('ended');
    expect(useCycleStore.getState().result).not.toBeNull();
  });

  it('reset() returns to idle and clears controller and result', () => {
    useCycleStore.getState().start({
      loadout: { characterId: 'K01', bpMax: 5, heroHpMax: 100, heroAtkBase: 10 },
      seed: 42,
    });
    useCycleStore.getState().abandon();
    useCycleStore.getState().reset();
    expect(useCycleStore.getState().status).toBe('idle');
    expect(useCycleStore.getState().controller).toBeNull();
    expect(useCycleStore.getState().result).toBeNull();
  });
});
