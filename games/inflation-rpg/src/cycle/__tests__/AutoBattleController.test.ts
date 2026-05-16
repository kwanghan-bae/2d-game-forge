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

describe('AutoBattleController — battle round', () => {
  it('emits battle_start within first round when BP > 0', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    ctrl.tick(700); // > 600ms roundMs
    const types = ctrl.getEvents().map(e => e.type);
    expect(types).toContain('battle_start');
  });

  it('emits hero_hit and enemy_hit alternating during a battle', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    for (let i = 0; i < 20; i++) ctrl.tick(600);
    const types = ctrl.getEvents().map(e => e.type);
    expect(types.filter(t => t === 'hero_hit').length).toBeGreaterThan(0);
    expect(types.filter(t => t === 'enemy_hit').length).toBeGreaterThan(0);
  });

  it('emits enemy_kill when enemy HP <= 0', () => {
    // Use very high heroAtkBase so first hit kills enemy.
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 5; i++) ctrl.tick(600);
    const types = ctrl.getEvents().map(e => e.type);
    expect(types).toContain('enemy_kill');
  });

  it('after enemy_kill, a fresh battle_start follows on next round', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 5; i++) ctrl.tick(600);
    const events = ctrl.getEvents();
    const killIdx = events.findIndex(e => e.type === 'enemy_kill');
    const nextStartIdx = events.findIndex((e, i) => i > killIdx && e.type === 'battle_start');
    expect(nextStartIdx).toBeGreaterThan(killIdx);
  });
});
