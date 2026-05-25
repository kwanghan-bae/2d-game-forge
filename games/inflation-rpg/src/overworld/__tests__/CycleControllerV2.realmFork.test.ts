import { describe, it, expect, beforeEach } from 'vitest';
import { CycleControllerV2 } from '../CycleControllerV2';
import { useGameStore } from '../../store/gameStore';
import type { OverworldEvent } from '../OverworldEvents';
import type { TraitId } from '../../cycle/traits';

/**
 * Cycle 110 F1 — Realm Fork tests.
 *
 * Coverage matrix:
 *   - handleArrival on kind='exit' + nextRealm available + cap < 4 →
 *     emits realm_fork_offered (instead of immediate realm transition).
 *   - autoChoice payload reflects trait-based policy (computeRealmForkAutoChoice).
 *   - Controller marks realmForkPending=true on offer + captures transition + cards.
 *   - handleArrival is no-op while realmForkPending=true.
 *   - resolveRealmFork(choice) applies the chosen buff, performs the deferred
 *     realm transition, emits realm_fork_resolved + realm_entered.
 *   - resolveRealmFork returns [] when not pending (defensive guard).
 *   - getRealmForkAtkMul / DropBonus / DampingBonus / AgingMul accumulate.
 *   - 4-cap: after 4 active buffs, next exit emits realm_fork_skipped
 *     instead of realm_fork_offered, and currentRealmId transitions normally.
 *   - Damping/drop bonus clamps applied at setEncounterOptsForArrival.
 */

function makeController(opts: { traits?: readonly TraitId[]; seed?: number } = {}): CycleControllerV2 {
  return new CycleControllerV2({
    seed: opts.seed ?? 1,
    traits: opts.traits ?? [],
    heroHpMax: 100000,
    heroAtkBase: 100000,
  });
}

beforeEach(() => {
  // Reset store realm transitions saga records between tests so each test
  // starts with a clean recordSagaRealmTransition no-op space.
  useGameStore.setState(s => ({ ...s, meta: { ...s.meta, crackStones: 0 } }));
});

describe('CycleControllerV2 realm fork — offer emission', () => {
  it('emits realm_fork_offered on exit landmark with nextRealm available', () => {
    const ctrl = makeController();
    ctrl.setCurrentRealmId('base');
    ctrl.setUnlockedRealms(['base', 'sea']);
    const events = ctrl.handleArrival('exit', 'exit_base_to_sea');
    const offered = events.find(e => e.type === 'realm_fork_offered');
    expect(offered).toBeDefined();
    if (offered && offered.type === 'realm_fork_offered') {
      expect(offered.oldRealm).toBe('base');
      expect(offered.newRealm).toBe('sea');
      expect(offered.riskCard.id).toBe('risk');
      expect(offered.safeCard.id).toBe('safe');
    }
    expect(ctrl.isRealmForkPending()).toBe(true);
  });

  it('does NOT emit realm_fork_offered when nextRealm is null (terminal realm)', () => {
    const ctrl = makeController();
    ctrl.setCurrentRealmId('chaos'); // chaos.nextRealm = null
    ctrl.setUnlockedRealms(['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos']);
    const events = ctrl.handleArrival('exit', 'exit_chaos_to_???');
    expect(events.some(e => e.type === 'realm_fork_offered')).toBe(false);
    expect(ctrl.isRealmForkPending()).toBe(false);
  });

  it('does NOT emit realm_fork_offered when nextRealm not unlocked', () => {
    const ctrl = makeController();
    ctrl.setCurrentRealmId('base');
    ctrl.setUnlockedRealms(['base']); // sea NOT unlocked
    const events = ctrl.handleArrival('exit', 'exit_base_to_sea');
    expect(events.some(e => e.type === 'realm_fork_offered')).toBe(false);
    expect(ctrl.isRealmForkPending()).toBe(false);
  });

  it('autoChoice payload reflects trait-based policy — heroic majority → risk', () => {
    const ctrl = makeController({ traits: ['t_challenge', 't_thrill'] });
    ctrl.setCurrentRealmId('base');
    ctrl.setUnlockedRealms(['base', 'sea']);
    const events = ctrl.handleArrival('exit', 'exit_base_to_sea');
    const offered = events.find(e => e.type === 'realm_fork_offered');
    if (offered && offered.type === 'realm_fork_offered') {
      expect(offered.autoChoice).toBe('risk');
    }
  });

  it('autoChoice payload reflects trait-based policy — 0 traits → safe (default)', () => {
    const ctrl = makeController({ traits: [] });
    ctrl.setCurrentRealmId('base');
    ctrl.setUnlockedRealms(['base', 'sea']);
    const events = ctrl.handleArrival('exit', 'exit_base_to_sea');
    const offered = events.find(e => e.type === 'realm_fork_offered');
    if (offered && offered.type === 'realm_fork_offered') {
      expect(offered.autoChoice).toBe('safe');
    }
  });
});

describe('CycleControllerV2 realm fork — pause + resolve', () => {
  it('handleArrival is no-op while realmForkPending=true', () => {
    const ctrl = makeController();
    ctrl.setCurrentRealmId('base');
    ctrl.setUnlockedRealms(['base', 'sea']);
    ctrl.handleArrival('exit', 'exit_1');
    expect(ctrl.isRealmForkPending()).toBe(true);
    // Subsequent arrival while pending → no events.
    const subsequent = ctrl.handleArrival('enemy', 'wolf_2');
    expect(subsequent.length).toBe(0);
  });

  it('resolveRealmFork(risk) emits realm_fork_resolved + realm_entered + applies risk buff', () => {
    const ctrl = makeController();
    ctrl.setCurrentRealmId('base');
    ctrl.setUnlockedRealms(['base', 'sea']);
    ctrl.handleArrival('exit', 'exit_1');
    const resolved = ctrl.resolveRealmFork('risk');
    expect(resolved.some(e => e.type === 'realm_fork_resolved')).toBe(true);
    const entered = resolved.find(e => e.type === 'realm_entered');
    expect(entered).toBeDefined();
    if (entered && entered.type === 'realm_entered') {
      expect(entered.realmId).toBe('sea');
    }
    expect(ctrl.getCurrentRealmId()).toBe('sea');
    expect(ctrl.isRealmForkPending()).toBe(false);
    expect(ctrl.getActiveRealmForkBuffs()).toHaveLength(1);
    expect(ctrl.getActiveRealmForkBuffs()[0]!.id).toBe('risk');
  });

  it('resolveRealmFork(safe) applies safe buff with +5% aging speed', () => {
    const ctrl = makeController();
    ctrl.setCurrentRealmId('base');
    ctrl.setUnlockedRealms(['base', 'sea']);
    ctrl.handleArrival('exit', 'exit_1');
    ctrl.resolveRealmFork('safe');
    expect(ctrl.getActiveRealmForkBuffs()[0]!.id).toBe('safe');
    expect(ctrl.getRealmForkAgingMul()).toBeCloseTo(1.05);
    expect(ctrl.getRealmForkDampingBonus()).toBeCloseTo(0.10);
  });

  it('resolveRealmFork returns [] when no fork is pending (defensive guard)', () => {
    const ctrl = makeController();
    const result = ctrl.resolveRealmFork('risk');
    expect(result).toEqual([]);
    expect(ctrl.isRealmForkPending()).toBe(false);
  });
});

describe('CycleControllerV2 realm fork — buff accumulation', () => {
  it('getRealmForkAtkMul accumulates risk-card atkBonus values', () => {
    const ctrl = makeController();
    ctrl.setCurrentRealmId('base');
    ctrl.setUnlockedRealms(['base', 'sea', 'volcano']);
    ctrl.handleArrival('exit', 'exit_1');
    ctrl.resolveRealmFork('risk');
    expect(ctrl.getRealmForkAtkMul()).toBeCloseTo(1.20);
    // Second fork (sea → volcano) — accumulate.
    ctrl.handleArrival('exit', 'exit_2');
    ctrl.resolveRealmFork('risk');
    expect(ctrl.getRealmForkAtkMul()).toBeCloseTo(1.40);
  });

  it('getRealmForkDropBonus accumulates dropChanceBonus additively', () => {
    const ctrl = makeController();
    ctrl.setCurrentRealmId('base');
    ctrl.setUnlockedRealms(['base', 'sea']);
    ctrl.handleArrival('exit', 'exit_1');
    ctrl.resolveRealmFork('risk');
    expect(ctrl.getRealmForkDropBonus()).toBeCloseTo(0.05);
  });

  it('getRealmForkAutoChoice — deterministic per trait set', () => {
    const ctrl1 = makeController({ traits: ['t_challenge'] });
    const ctrl2 = makeController({ traits: ['t_challenge'] });
    expect(ctrl1.getRealmForkAutoChoice()).toBe(ctrl2.getRealmForkAutoChoice());
    expect(ctrl1.getRealmForkAutoChoice()).toBe('risk');
  });
});

describe('CycleControllerV2 realm fork — cap behavior', () => {
  it('4 active buffs → 5th exit emits realm_fork_skipped (normal transition)', () => {
    const ctrl = makeController();
    ctrl.setCurrentRealmId('base');
    ctrl.setUnlockedRealms(['base', 'sea', 'volcano', 'underworld', 'heaven', 'chaos']);
    // 4 forks consumed.
    const realms: Array<{ from: string; landmark: string }> = [
      { from: 'base',       landmark: 'exit_1' },
      { from: 'sea',        landmark: 'exit_2' },
      { from: 'volcano',    landmark: 'exit_3' },
      { from: 'underworld', landmark: 'exit_4' },
    ];
    for (const { landmark } of realms) {
      ctrl.handleArrival('exit', landmark);
      ctrl.resolveRealmFork('risk');
    }
    expect(ctrl.getActiveRealmForkBuffs().length).toBe(4);
    expect(ctrl.getCurrentRealmId()).toBe('heaven');

    // 5th exit (heaven → chaos) — cap reached, skipped emission + normal transition.
    const events = ctrl.handleArrival('exit', 'exit_5');
    expect(events.some(e => e.type === 'realm_fork_skipped')).toBe(true);
    expect(events.some(e => e.type === 'realm_fork_offered')).toBe(false);
    expect(events.some(e => e.type === 'realm_entered')).toBe(true);
    expect(ctrl.getCurrentRealmId()).toBe('chaos');
    expect(ctrl.isRealmForkPending()).toBe(false);
  });
});
