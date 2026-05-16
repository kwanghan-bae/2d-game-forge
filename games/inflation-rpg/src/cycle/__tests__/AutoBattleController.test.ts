import { describe, it, expect } from 'vitest';
import { AutoBattleController, type ControllerLoadout } from '../AutoBattleController';

const minimalLoadout = (): ControllerLoadout => ({
  characterId: 'K01',
  bpMax: 30,
  heroHpMax: 100,
  heroAtkBase: 10,
  // Sim-A: equipment / ascension / relics / mythics omitted — pulled from gameStore in later phases.
});

describe('AutoBattleController — skeleton', () => {
  it('constructs without crashing and exposes initial state', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    const state = ctrl.getState();
    expect(state.heroLv).toBe(1);
    expect(state.heroExp).toBe(0);
    expect(state.bp).toBe(30);
    expect(state.ended).toBe(false);
  });

  it('emits cycle_start event on first construction', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    const events = ctrl.getEvents();
    expect(events.length).toBe(1);
    expect(events[0].type).toBe('cycle_start');
  });

  it('tick(0) is a no-op (no time advance)', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    const before = ctrl.getEvents().length;
    ctrl.tick(0);
    expect(ctrl.getEvents().length).toBe(before);
  });

  it('same seed produces identical event sequence after N ticks', () => {
    const a = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    const b = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    for (let i = 0; i < 50; i++) {
      a.tick(100);
      b.tick(100);
    }
    expect(JSON.stringify(a.getEvents())).toBe(JSON.stringify(b.getEvents()));
  });
});
