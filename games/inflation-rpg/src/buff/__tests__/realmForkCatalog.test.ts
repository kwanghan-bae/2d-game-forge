import { describe, it, expect } from 'vitest';
import type { TraitId } from '../../cycle/traits';
import {
  REALM_FORK_CATALOG,
  computeRealmForkAutoChoice,
  findRealmForkCard,
  getRealmForkPair,
} from '../realmForkCatalog';

/**
 * Cycle 110 F1 — RealmForkCatalog test.
 *
 * Coverage:
 *   - catalog shape (2 fixed cards, risk/safe with correct effect magnitudes)
 *   - findRealmForkCard returns the right card
 *   - getRealmForkPair returns both
 *   - computeRealmForkAutoChoice — trait-based deterministic policy across:
 *     - heroic majority → 'risk'
 *     - prudent majority → 'safe'
 *     - tie (incl. 0=0) → 'safe' (보수 default)
 *     - single heroic trait → 'risk'
 *     - single prudent trait → 'safe'
 *     - neutral-only → 'safe'
 *
 * PRD §F1.동작(3) + §F1.동작(4).
 */

describe('RealmForkCatalog — shape', () => {
  it('exposes 2 fixed cards (risk + safe)', () => {
    expect(REALM_FORK_CATALOG.risk).toBeDefined();
    expect(REALM_FORK_CATALOG.safe).toBeDefined();
    expect(REALM_FORK_CATALOG.risk.id).toBe('risk');
    expect(REALM_FORK_CATALOG.safe.id).toBe('safe');
  });

  it('risk card matches PRD §F1.동작(3) — atk +20%, drop +5%p, damping -0.1', () => {
    const r = REALM_FORK_CATALOG.risk;
    expect(r.effect.atkBonus).toBeCloseTo(0.20);
    expect(r.effect.dropChanceBonus).toBeCloseTo(0.05);
    expect(r.effect.dampingBonus).toBeCloseTo(-0.10);
    expect(r.effect.agingSpeedMul).toBe(0);
  });

  it('safe card matches PRD §F1.동작(3) — damping +0.1, agingSpeedMul +5%', () => {
    const s = REALM_FORK_CATALOG.safe;
    expect(s.effect.atkBonus).toBe(0);
    expect(s.effect.dropChanceBonus).toBe(0);
    expect(s.effect.dampingBonus).toBeCloseTo(0.10);
    expect(s.effect.agingSpeedMul).toBeCloseTo(0.05);
  });

  it('findRealmForkCard returns the correct card', () => {
    expect(findRealmForkCard('risk').id).toBe('risk');
    expect(findRealmForkCard('safe').id).toBe('safe');
  });

  it('getRealmForkPair returns both fixed cards', () => {
    const pair = getRealmForkPair();
    expect(pair.risk).toBe(REALM_FORK_CATALOG.risk);
    expect(pair.safe).toBe(REALM_FORK_CATALOG.safe);
  });
});

describe('computeRealmForkAutoChoice — trait-based policy', () => {
  it('0 traits → safe (보수 default, fate-roll auto-decline 정신)', () => {
    expect(computeRealmForkAutoChoice([])).toBe('safe');
  });

  it('1 heroic-aligned (t_challenge) → risk', () => {
    const traits: TraitId[] = ['t_challenge'];
    expect(computeRealmForkAutoChoice(traits)).toBe('risk');
  });

  it('1 prudent-aligned (t_timid) → safe', () => {
    const traits: TraitId[] = ['t_timid'];
    expect(computeRealmForkAutoChoice(traits)).toBe('safe');
  });

  it('heroic majority (2 heroic + 1 prudent) → risk', () => {
    const traits: TraitId[] = ['t_thrill', 't_berserker', 't_iron'];
    expect(computeRealmForkAutoChoice(traits)).toBe('risk');
  });

  it('prudent majority (2 prudent + 1 heroic) → safe', () => {
    const traits: TraitId[] = ['t_timid', 't_fragile', 't_boss_hunter'];
    expect(computeRealmForkAutoChoice(traits)).toBe('safe');
  });

  it('tie (1 heroic + 1 prudent) → safe (default)', () => {
    const traits: TraitId[] = ['t_zealot', 't_miser'];
    expect(computeRealmForkAutoChoice(traits)).toBe('safe');
  });

  it('neutral-only traits (no heroic, no prudent) → safe', () => {
    const traits: TraitId[] = ['t_swift', 't_explorer', 't_lucky'];
    expect(computeRealmForkAutoChoice(traits)).toBe('safe');
  });

  it('all 5 heroic-aligned → risk', () => {
    const traits: TraitId[] = ['t_challenge', 't_thrill', 't_berserker', 't_boss_hunter', 't_zealot'];
    expect(computeRealmForkAutoChoice(traits)).toBe('risk');
  });

  it('all 4 prudent-aligned → safe', () => {
    const traits: TraitId[] = ['t_timid', 't_fragile', 't_iron', 't_miser'];
    expect(computeRealmForkAutoChoice(traits)).toBe('safe');
  });

  it('deterministic — same trait set in different order = same choice', () => {
    const traitsA: TraitId[] = ['t_challenge', 't_iron', 't_swift'];
    const traitsB: TraitId[] = ['t_swift', 't_iron', 't_challenge'];
    expect(computeRealmForkAutoChoice(traitsA)).toBe(computeRealmForkAutoChoice(traitsB));
  });
});
