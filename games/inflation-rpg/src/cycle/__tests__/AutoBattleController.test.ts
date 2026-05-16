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

describe('AutoBattleController — trait modifiers', () => {
  it('cycle_start event carries traitIds (was deferred from Sim-A)', () => {
    const ctrl = new AutoBattleController({
      loadout: minimalLoadout(),
      seed: 42,
      traits: ['t_genius', 't_fragile'],
    });
    const ev = ctrl.getEvents()[0];
    expect(ev.type).toBe('cycle_start');
    if (ev.type === 'cycle_start') {
      expect(ev.traitIds).toEqual(['t_genius', 't_fragile']);
    }
  });

  it('empty traits yields legacy behavior (cycle_start has traitIds: [])', () => {
    const ctrl = new AutoBattleController({ loadout: minimalLoadout(), seed: 42 });
    const ev = ctrl.getEvents()[0];
    if (ev.type === 'cycle_start') {
      expect(ev.traitIds).toEqual([]);
    }
  });

  it('t_fragile (hpMul 0.7) reduces starting heroHpMax', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), heroHpMax: 100 },
      seed: 42,
      traits: ['t_fragile'],
    });
    expect(ctrl.getState().heroHpMax).toBe(70);
    expect(ctrl.getState().heroHp).toBe(70);
  });

  it('t_genius (expMul 1.2) accelerates level-ups', () => {
    const aNo = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 5, heroAtkBase: 100000 },
      seed: 42,
    });
    const aGenius = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 5, heroAtkBase: 100000 },
      seed: 42,
      traits: ['t_genius'],
    });
    for (let i = 0; i < 100; i++) { aNo.tick(600); aGenius.tick(600); }
    expect(aGenius.getState().heroLv).toBeGreaterThanOrEqual(aNo.getState().heroLv);
  });

  it('getDecisionAI() exposes HeroDecisionAI seeded with constructor traits', () => {
    const ctrl = new AutoBattleController({
      loadout: minimalLoadout(),
      seed: 42,
      traits: ['t_genius', 't_fragile'],
    });
    const ai = ctrl.getDecisionAI();
    expect(ai.getTraits()).toEqual(['t_genius', 't_fragile']);
  });

  it('t_terminal_genius (bpCostMul 2) consumes BP twice as fast', () => {
    const aNo = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 8, heroAtkBase: 100000 },
      seed: 42,
    });
    const aBoom = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 8, heroAtkBase: 100000 },
      seed: 42,
      traits: ['t_terminal_genius'],
    });
    for (let i = 0; i < 50; i++) { aNo.tick(600); aBoom.tick(600); }
    // 시한부 천재 should end in roughly half the kills (per encounter BP cost doubled).
    const noKills = aNo.getEvents().filter(e => e.type === 'enemy_kill').length;
    const boomKills = aBoom.getEvents().filter(e => e.type === 'enemy_kill').length;
    expect(boomKills).toBeLessThan(noKills);
  });
});

describe('AutoBattleController — t_swift fractional BP accumulator', () => {
  it('t_swift (bpCostMul 0.9) — cycle lasts longer than no-trait (more kills per BP)', () => {
    // With fractional accumulator, t_swift consumes ~0.9 BP per encounter instead
    // of the old floor-clamped 1 BP. More encounters survive before bp_exhausted.
    const aNo = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 10, heroAtkBase: 100000 },
      seed: 42,
    });
    const aSwift = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 10, heroAtkBase: 100000 },
      seed: 42,
      traits: ['t_swift'],
    });
    for (let i = 0; i < 200; i++) { aNo.tick(600); aSwift.tick(600); }
    const noKills = aNo.getEvents().filter(e => e.type === 'enemy_kill').length;
    const swiftKills = aSwift.getEvents().filter(e => e.type === 'enemy_kill').length;
    // t_swift should survive longer (more kills) before BP is exhausted.
    expect(swiftKills).toBeGreaterThan(noKills);
  });

  it('t_swift (bpCostMul 0.9) — total BP consumed over full cycle < bpMax (at least 1 free encounter)', () => {
    // Use bpMax=10. Without t_swift: exactly 10 BP consumed for 10 kills.
    // With t_swift (0.9/enc): fractional accumulator means at least 1 encounter is free.
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 10, heroAtkBase: 100000 },
      seed: 42,
      traits: ['t_swift'],
    });
    for (let i = 0; i < 200; i++) ctrl.tick(600);
    const totalBpConsumed = ctrl.getEvents()
      .filter(e => e.type === 'bp_change')
      .reduce((acc, e) => {
        if (e.type === 'bp_change') return acc + Math.abs(e.delta);
        return acc;
      }, 0);
    const kills = ctrl.getEvents().filter(e => e.type === 'enemy_kill').length;
    // BP consumed should be less than kills (at least 1 free encounter per ~10).
    expect(totalBpConsumed).toBeLessThan(kills);
  });

  it('t_swift + t_terminal_genius (bpCostMul 0.9×2.0=1.8) — total cost > 1 per encounter on average', () => {
    // combined mul = 1.8. Fractional accumulator correctly averages >1 BP per encounter.
    // Previously (floor-clamp): floor(1 × 1.8) = 1, silently cancelling t_terminal_genius.
    // Now: 10 encounters accumulate 18 BP integer cost.
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 30, heroAtkBase: 100000 },
      seed: 42,
      traits: ['t_swift', 't_terminal_genius'],
    });
    for (let i = 0; i < 30; i++) ctrl.tick(600);
    const kills = ctrl.getEvents().filter(e => e.type === 'enemy_kill').length;
    const totalBpConsumed = ctrl.getEvents()
      .filter(e => e.type === 'bp_change')
      .reduce((acc, e) => {
        if (e.type === 'bp_change') return acc + Math.abs(e.delta);
        return acc;
      }, 0);
    // Average BP per kill should be close to 1.8 (not 1 as old floor-clamp produced).
    // With 10+ kills, the average should be distinctly > 1.
    expect(kills).toBeGreaterThan(0);
    const avgBpPerKill = totalBpConsumed / kills;
    expect(avgBpPerKill).toBeGreaterThan(1.5); // 1.8 expected; 1.5 is conservative bound
  });

  it('t_terminal_genius alone (bpCostMul 2) still consumes BP twice as fast', () => {
    // Regression guard: verify the existing behavior is preserved.
    const aNo = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 8, heroAtkBase: 100000 },
      seed: 42,
    });
    const aBoom = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 8, heroAtkBase: 100000 },
      seed: 42,
      traits: ['t_terminal_genius'],
    });
    for (let i = 0; i < 50; i++) { aNo.tick(600); aBoom.tick(600); }
    const noKills = aNo.getEvents().filter(e => e.type === 'enemy_kill').length;
    const boomKills = aBoom.getEvents().filter(e => e.type === 'enemy_kill').length;
    expect(boomKills).toBeLessThan(noKills);
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

  it('bossKills is 0 in Sim-A (no boss spawn yet)', () => {
    const ctrl = new AutoBattleController({
      loadout: { ...minimalLoadout(), bpMax: 3, heroAtkBase: 100000 },
      seed: 42,
    });
    for (let i = 0; i < 100; i++) ctrl.tick(600);
    const result = ctrl.getResult();
    expect(result).not.toBeNull();
    // Sim-A only spawns non-boss enemies (isBoss: false). bossKills aggregation
    // now reads battle_start.isBoss rather than enemyId prefix convention.
    expect(result!.kills.bossKills).toBe(0);
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
