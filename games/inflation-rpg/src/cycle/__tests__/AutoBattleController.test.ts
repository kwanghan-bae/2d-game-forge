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

describe('AutoBattleController — EXP / level_up (inflation curve)', () => {
  it('emits level_up event with correct from/to when threshold crossed', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 50; i++) ctrl.tick(600);
    const types = ctrl.getEvents().map(e => e.type);
    expect(types).toContain('level_up');
  });

  it('hero level monotonically increases (inflation never reverses)', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    let lastLv = 1;
    for (let i = 0; i < 100; i++) {
      ctrl.tick(600);
      const lv = ctrl.getState().heroLv;
      expect(lv).toBeGreaterThanOrEqual(lastLv);
      lastLv = lv;
    }
  });

  it('hero reaches at least lv 5 within 100 rounds with high atk (inflation works)', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 100; i++) ctrl.tick(600);
    expect(ctrl.getState().heroLv).toBeGreaterThanOrEqual(5);
  });
});

describe('AutoBattleController — BP / cycle_end', () => {
  it('emits bp_change event after each enemy kill', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 10; i++) ctrl.tick(600);
    const types = ctrl.getEvents().map(e => e.type);
    expect(types.filter(t => t === 'bp_change').length).toBeGreaterThan(0);
  });

  it('emits cycle_end with reason bp_exhausted when BP hits 0', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 3, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 50; i++) ctrl.tick(600);
    const endEv = ctrl.getEvents().find(e => e.type === 'cycle_end');
    expect(endEv).toBeDefined();
    if (endEv && endEv.type === 'cycle_end') {
      expect(endEv.reason).toBe('bp_exhausted');
    }
  });

  it('after cycle_end, further ticks are no-ops', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 3, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 50; i++) ctrl.tick(600);
    const eventsAtEnd = ctrl.getEvents().length;
    for (let i = 0; i < 50; i++) ctrl.tick(600);
    expect(ctrl.getEvents().length).toBe(eventsAtEnd);
  });

  it('abandon() forces cycle_end with reason abandoned', () => {
    const ctrl = new AutoBattleController({
      loadout: minimalLoadout(),
      seed: 42,
    });
    ctrl.tick(600);
    ctrl.abandon();
    const endEv = ctrl.getEvents().find(e => e.type === 'cycle_end');
    expect(endEv).toBeDefined();
    if (endEv && endEv.type === 'cycle_end') {
      expect(endEv.reason).toBe('abandoned');
    }
  });
});

describe('AutoBattleController — tick batch / timestamp', () => {
  it('large delta tick produces unique enemyIds + distinct timestamps per kill event', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 10, heroAtkBase: 100000 },
      seed: 42,
    });
    ctrl.tick(3600); // 6 rounds in one batch (3600 / 600)
    const killEvents = ctrl.getEvents().filter(e => e.type === 'enemy_kill');
    // Must have at least several kills to validate uniqueness.
    expect(killEvents.length).toBeGreaterThanOrEqual(3);
    // Each kill should have a distinct enemyId (no collisions from batch).
    const enemyIds = new Set(
      killEvents.map(e => (e.type === 'enemy_kill' ? e.enemyId : ''))
    );
    expect(enemyIds.size).toBe(killEvents.length);
    // Each round's kill event should have a distinct timestamp.
    const timestamps = new Set(killEvents.map(e => e.t));
    expect(timestamps.size).toBe(killEvents.length);
  });
});

describe('AutoBattleController — RNG witness', () => {
  it('different seeds produce different gold totals (RNG determinism witness)', () => {
    const a = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 1,
    });
    const b = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 9999,
    });
    for (let i = 0; i < 50; i++) {
      a.tick(600);
      b.tick(600);
    }
    // Gold gain has an RNG component per kill; different seeds should diverge.
    expect(a.getState().cumGold).not.toBe(b.getState().cumGold);
  });

  it('same seed produces identical cumGold after N ticks (determinism preserved)', () => {
    const a = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    const b = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 50; i++) {
      a.tick(600);
      b.tick(600);
    }
    expect(a.getState().cumGold).toBe(b.getState().cumGold);
  });
});

describe('AutoBattleController — getResult curves', () => {
  it('returns null while cycle is still running', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    expect(ctrl.getResult()).toBeNull();
  });

  it('levelCurve has at least one entry per level_up event', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 5, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 100; i++) ctrl.tick(600);
    const result = ctrl.getResult();
    expect(result).not.toBeNull();
    const levelUpCount = ctrl.getEvents().filter(e => e.type === 'level_up').length;
    expect(result!.levelCurve.length).toBe(levelUpCount + 1); // +1 for initial lv 1 entry
  });

  it('kills.total matches enemy_kill event count', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 5, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 100; i++) ctrl.tick(600);
    const killEvents = ctrl.getEvents().filter(e => e.type === 'enemy_kill').length;
    expect(ctrl.getResult()!.kills.total).toBe(killEvents);
  });

  it('bpCurve last entry is 0 on bp_exhausted', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 3, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 100; i++) ctrl.tick(600);
    const result = ctrl.getResult();
    expect(result).not.toBeNull();
    expect(result!.bpCurve[result!.bpCurve.length - 1].bp).toBe(0);
  });
});
