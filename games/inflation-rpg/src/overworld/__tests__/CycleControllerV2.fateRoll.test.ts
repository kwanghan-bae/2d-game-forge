import { describe, it, expect, beforeEach } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';
import { EncounterEngine } from '../EncounterEngine';
import { HeroEntity } from '../../hero/HeroEntity';
import { SeededRng } from '../../cycle/SeededRng';
import { useGameStore } from '../../store/gameStore';
import type { OverworldEvent } from '../OverworldEvents';

/**
 * Cycle 108 F1 — Fate Roll on Death tests.
 *
 * Behaviour matrix:
 *   - EncounterEngine emits fate_roll_required (not hero_died) when
 *     isFateRollEligible() returns true AND hero would die.
 *   - Controller marks fateRollConsumed=true + fateRollPending=true on emit.
 *   - resolveFateRoll('accept') spends 1 crackStone + restores HP 50%.
 *   - resolveFateRoll('decline') applies death penalty + emits hero_died.
 *   - Once consumed, subsequent deaths in same cycle skip fate roll (cap=1).
 *   - handleArrival is no-op while fateRollPending=true (stagger-recover
 *     bypass risk — same class as cycle 14 stuck-state).
 *   - crackStones < 1 with 'accept' falls through to decline path (UI guard).
 */

function makeFrailHero(seed = 1) {
  // 1 HP / 1 ATK → always loses an enemy battle.
  return HeroEntity.create({ seed, heroHpMax: 1, heroAtkBase: 1 });
}

beforeEach(() => {
  // Reset crackStones to 0 — tests opt-in by setting before resolve.
  useGameStore.setState(s => ({ ...s, meta: { ...s.meta, crackStones: 0 } }));
});

describe('EncounterEngine fate roll intercept', () => {
  it('emits fate_roll_required (not hero_died) when isFateRollEligible=true and hero dies', () => {
    const hero = makeFrailHero();
    const engine = new EncounterEngine(new SeededRng(1), {
      isFateRollEligible: () => true,
    });
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.some(e => e.type === 'fate_roll_required')).toBe(true);
    expect(events.some(e => e.type === 'hero_died')).toBe(false);
  });

  it('emits hero_died (not fate_roll_required) when isFateRollEligible=false', () => {
    const hero = makeFrailHero();
    const engine = new EncounterEngine(new SeededRng(1), {
      isFateRollEligible: () => false,
    });
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.some(e => e.type === 'hero_died')).toBe(true);
    expect(events.some(e => e.type === 'fate_roll_required')).toBe(false);
  });

  it('emits hero_died when isFateRollEligible callback is undefined', () => {
    const hero = makeFrailHero();
    const engine = new EncounterEngine(new SeededRng(1)); // no callback
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    expect(events.some(e => e.type === 'hero_died')).toBe(true);
  });

  it('fate_roll_required carries pendingDeathPenaltyNewLevel preview without mutating hero level', () => {
    const hero = makeFrailHero();
    hero.level = 100;
    hero.recomputeStats();
    // Reset HP to 1 after recomputeStats so hero still dies.
    hero.hp = 1;
    const engine = new EncounterEngine(new SeededRng(1), {
      isFateRollEligible: () => true,
    });
    // Disable level sacrifice so it doesn't fire before fate_roll intercept
    (engine as any).levelSacrificeCooldown = 50;
    const events = engine.resolveEncounter(hero, 'enemy', 'wolf_1');
    const fr = events.find(e => e.type === 'fate_roll_required');
    expect(fr).toBeDefined();
    if (fr && fr.type === 'fate_roll_required') {
      // floor(100 * 0.9) = 90.
      expect(fr.oldLevel).toBe(100);
      expect(fr.pendingDeathPenaltyNewLevel).toBe(90);
    }
    // Engine must NOT have mutated level (level penalty deferred to controller).
    expect(hero.level).toBe(100);
  });
});

describe('CycleControllerV2 fate roll wiring', () => {
  it('controller emits fate_roll_required when hero dies and fate is available', () => {
    const ctrl = new CycleControllerV2({
      seed: 1,
      traits: [],
      heroHpMax: 1,
      heroAtkBase: 1,
    });
    const events = ctrl.handleArrival('enemy', 'wolf_1');
    expect(events.some(e => e.type === 'fate_roll_required')).toBe(true);
    expect(ctrl.isFateRollPending()).toBe(true);
    expect(ctrl.isFateRollConsumed()).toBe(true);
  });

  it('handleArrival is no-op while fateRollPending=true (stagger-recover bypass guard)', () => {
    const ctrl = new CycleControllerV2({
      seed: 1,
      traits: [],
      heroHpMax: 1,
      heroAtkBase: 1,
    });
    ctrl.handleArrival('enemy', 'wolf_1'); // sets pending=true
    expect(ctrl.isFateRollPending()).toBe(true);
    const beforeHp = ctrl.getHero().hp;
    const beforeStaggered = ctrl.getHero().staggered;
    const events = ctrl.handleArrival('enemy', 'wolf_2');
    // While pending, no events emit and hero state unchanged. Critically the
    // stagger-recover path (would set hp = hpMax + staggered=false) does NOT run.
    expect(events).toEqual([]);
    expect(ctrl.getHero().hp).toBe(beforeHp);
    expect(ctrl.getHero().staggered).toBe(beforeStaggered);
  });
});

describe('resolveFateRoll accept path', () => {
  it('spends 1 crackStone, sets HP to ceil(maxHp * 0.5), clears staggered, no death penalty', () => {
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, crackStones: 5 } }));
    const ctrl = new CycleControllerV2({
      seed: 1,
      traits: [],
      heroHpMax: 1,
      heroAtkBase: 1,
    });
    ctrl.handleArrival('enemy', 'wolf_1');
    const levelBefore = ctrl.getHero().level;
    const events = ctrl.resolveFateRoll('accept');

    expect(useGameStore.getState().meta.crackStones).toBe(4);
    expect(ctrl.getHero().staggered).toBe(false);
    expect(ctrl.getHero().hp).toBe(Math.ceil(ctrl.getHero().hpMax * 0.5));
    // No level penalty applied.
    expect(ctrl.getHero().level).toBe(levelBefore);
    expect(ctrl.isFateRollPending()).toBe(false);
    // Resolved event present, no hero_died.
    const resolved = events.find(e => e.type === 'fate_roll_resolved');
    expect(resolved && resolved.type === 'fate_roll_resolved' && resolved.outcome).toBe('accept');
    expect(events.some(e => e.type === 'hero_died')).toBe(false);
  });

  it('records fateRoll saga with outcome=accepted on accept', () => {
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, crackStones: 2 } }));
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    ctrl.handleArrival('enemy', 'wolf_1');
    ctrl.resolveFateRoll('accept');
    const saga = ctrl.finalize();
    const fateRecords = saga.chapters
      .flatMap(c => c.events)
      .filter(e => e.type === 'fateRoll');
    expect(fateRecords.length).toBe(1);
    expect((fateRecords[0]!.payload as { outcome: string }).outcome).toBe('accepted');
  });

  it("accept with crackStones=0 falls through to decline path (UI should disable but guard is defensive)", () => {
    // crackStones already 0 from beforeEach.
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    ctrl.handleArrival('enemy', 'wolf_1');
    const levelBefore = ctrl.getHero().level;
    const events = ctrl.resolveFateRoll('accept');
    // Death penalty applied (decline branch).
    expect(ctrl.getHero().level).toBe(Math.max(1, Math.floor(levelBefore * 0.9)));
    // hero_died emit.
    expect(events.some(e => e.type === 'hero_died')).toBe(true);
    // crackStones not spent (stayed 0).
    expect(useGameStore.getState().meta.crackStones).toBe(0);
  });
});

describe('resolveFateRoll decline path', () => {
  it('applies death penalty + emits hero_died(cause=전사) + sets endCause', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    // Give hero some level to make the penalty observable.
    ctrl.getHero().level = 50;
    ctrl.getHero().recomputeStats();
    ctrl.getHero().hp = 1;
    // Disable level sacrifice so it doesn't fire before fate_roll intercept
    (ctrl as any).encounter.levelSacrificeCooldown = 50;
    ctrl.handleArrival('enemy', 'wolf_1');

    const events = ctrl.resolveFateRoll('decline');
    expect(ctrl.getHero().level).toBe(45); // floor(50 * 0.9) = 45
    expect(ctrl.getEndCause()).toBe('전사');
    const heroDied = events.find(e => e.type === 'hero_died');
    expect(heroDied).toBeDefined();
    if (heroDied && heroDied.type === 'hero_died') {
      expect(heroDied.cause).toBe('전사');
      expect(heroDied.oldLevel).toBe(50);
      expect(heroDied.newLevel).toBe(45);
    }
    const resolved = events.find(e => e.type === 'fate_roll_resolved');
    expect(resolved && resolved.type === 'fate_roll_resolved' && resolved.outcome).toBe('decline');
  });

  it('decline does not spend crackStones', () => {
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, crackStones: 3 } }));
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    ctrl.handleArrival('enemy', 'wolf_1');
    ctrl.resolveFateRoll('decline');
    expect(useGameStore.getState().meta.crackStones).toBe(3);
  });

  it('records fateRoll saga with outcome=declined on decline', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    ctrl.handleArrival('enemy', 'wolf_1');
    ctrl.resolveFateRoll('decline');
    const saga = ctrl.finalize();
    const fateRecords = saga.chapters
      .flatMap(c => c.events)
      .filter(e => e.type === 'fateRoll');
    expect(fateRecords.length).toBe(1);
    expect((fateRecords[0]!.payload as { outcome: string }).outcome).toBe('declined');
  });
});

describe('cycle 108 F1 — 1 cycle 1 회 cap', () => {
  it('after consume, subsequent deaths skip fate roll path', () => {
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, crackStones: 5 } }));
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    // 1st death — fate roll emit + accept (revives hero).
    ctrl.handleArrival('enemy', 'wolf_1');
    expect(ctrl.isFateRollPending()).toBe(true);
    ctrl.resolveFateRoll('accept');
    expect(ctrl.isFateRollConsumed()).toBe(true);

    // Force hero back to near-death so the next encounter kills.
    ctrl.getHero().hp = 1;
    ctrl.getHero().staggered = false;
    const events = ctrl.handleArrival('enemy', 'wolf_2');
    // 2nd death — fate roll consumed → no fate_roll_required, just hero_died.
    expect(events.some(e => e.type === 'fate_roll_required')).toBe(false);
    expect(events.some(e => e.type === 'hero_died')).toBe(true);
  });
});

describe('resolveFateRoll no-op safety', () => {
  it('resolveFateRoll when not pending returns []', () => {
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 100, heroAtkBase: 100000,
    });
    expect(ctrl.resolveFateRoll('accept')).toEqual([]);
    expect(ctrl.resolveFateRoll('decline')).toEqual([]);
  });

  it('double-resolve is safe (second call returns [])', () => {
    useGameStore.setState(s => ({ ...s, meta: { ...s.meta, crackStones: 2 } }));
    const ctrl = new CycleControllerV2({
      seed: 1, traits: [], heroHpMax: 1, heroAtkBase: 1,
    });
    ctrl.handleArrival('enemy', 'wolf_1');
    const first = ctrl.resolveFateRoll('accept');
    expect(first.length).toBeGreaterThan(0);
    const second = ctrl.resolveFateRoll('decline');
    expect(second).toEqual([]);
  });
});

describe('lightEmit excluded events (fate roll)', () => {
  it('fate_roll_required + fate_roll_resolved emit 0 light', async () => {
    const { computeLightDelta } = await import('../lightEmit');
    const evs: OverworldEvent[] = [
      { type: 'fate_roll_required', enemyId: 'w1', oldLevel: 10, pendingDeathPenaltyNewLevel: 9 },
      { type: 'fate_roll_resolved', outcome: 'accept' },
      { type: 'fate_roll_resolved', outcome: 'decline' },
    ];
    expect(computeLightDelta(evs, 'enemy').delta).toBe(0);
  });
});
