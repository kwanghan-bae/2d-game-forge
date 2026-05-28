import { describe, it, expect } from 'vitest';
import { getPassiveBonuses } from './passives';
import { CHARACTERS } from '../data/characters';

/**
 * Passive balance sim — verifies no single passive exceeds
 * a 2x power budget relative to the weakest passive.
 *
 * Power metric: estimated DPS multiplier accounting for all passive effects.
 */

function estimatePowerMult(characterId: string): number {
  const pb = getPassiveBonuses(characterId);

  // Base multiplier from stat_boost (affects ATK directly)
  let power = pb.statBoostMult;

  // Crit: assume base crit = 15%, crit does 2x damage
  // Extra crit adds: critBonus * (2-1) = critBonus in expected DPS
  power *= (1 + pb.critRateBonus);

  // Boss damage: weighted 30% (30% of encounters are bosses approx)
  power *= (1 + (pb.bossDamageMult - 1) * 0.3);

  // First strike: only first round matters, diminishing over time
  // Assume avg 5 rounds per fight: first_strike adds (mult-1)/5
  power *= (1 + (pb.firstStrikeMult - 1) * 0.2);

  // Dodge: effective HP multiplier = 1/(1-dodgeRate)
  const ehpMult = 1 / (1 - pb.dodgeRateBonus);
  power *= Math.sqrt(ehpMult); // sqrt because EHP is defensive, not offensive

  // Exp/Gold boosts: progression speed, counts as ~0.3x weight for "power"
  power *= (1 + (pb.expBoostMult - 1) * 0.3);
  power *= (1 + (pb.goldBoostMult - 1) * 0.2);

  // Item find: DR boost accelerates gear progression, ~0.25 weight
  power *= (1 + (pb.itemFindMult - 1) * 0.25);

  // Beast damage: non-boss mob damage boost, weighted 70% (70% encounters are non-boss)
  power *= (1 + (pb.beastDamageMult - 1) * 0.7);

  // Life conversion: HP→ATK fraction, assume avg playerHP ~500 at mid-game vs base ATK ~100
  // Effective ATK boost ≈ lifeConversion * 5 (500/100). Very rough heuristic.
  power *= (1 + pb.lifeConversion * 5);

  return power;
}

describe('Passive balance sim', () => {
  it('no passive exceeds 2x power ratio vs weakest', () => {
    const powers = CHARACTERS.map((c) => ({
      id: c.id,
      power: estimatePowerMult(c.id),
    }));

    const minPower = Math.min(...powers.map((p) => p.power));
    const maxPower = Math.max(...powers.map((p) => p.power));

    const ratio = maxPower / minPower;
    // Allow max 2x disparity
    expect(ratio).toBeLessThan(2.0);
  });

  it('all characters have power > 1.0 (passives always beneficial)', () => {
    for (const char of CHARACTERS) {
      const power = estimatePowerMult(char.id);
      expect(power).toBeGreaterThanOrEqual(1.0);
    }
  });

  it('stat_boost characters are not strictly dominant', () => {
    const hwarang = estimatePowerMult('hwarang');
    const seonin = estimatePowerMult('seonin');
    const geomgaek = estimatePowerMult('geomgaek');
    const yacha = estimatePowerMult('yacha');

    // Specialized passives should be competitive with generic stat boost
    expect(geomgaek).toBeGreaterThan(hwarang * 0.85);
    expect(yacha).toBeGreaterThan(hwarang * 0.85);
    expect(seonin).toBeGreaterThan(hwarang);
  });
});
