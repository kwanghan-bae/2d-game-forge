/**
 * anomalyBalance.test.ts — C1113: Spacetime Anomaly Risk-Reward & Economy Balance Simulation.
 *
 * Mathematically validates the trade-offs across all 4 Spacetime Anomalies
 * and the 3 Tactical Approaches (Stabilize, Harness, Collapse).
 */

import { describe, it, expect } from 'vitest';
import {
  ANOMALIES,
  resolveAnomalyModifiers,
} from './spacetimeAnomaly';

describe('anomalyBalance (C1113)', () => {
  describe('Chrono Surge: Speed Acceleration vs Damage Taken', () => {
    it('demonstrates net damage efficiency when hero burst reduces total combat turns', () => {
      const mods = resolveAnomalyModifiers('chrono_surge', 'harness');

      // Baseline enemy: HP 10M, ATK 500k
      const enemyHp = 10_000_000;
      const enemyAtk = 500_000;

      // Hero base ATK: 3.5M
      const baseHeroAtk = 3_500_000;

      // Normal combat turns: ceil(10M / 3.5M) = 3 turns
      const normalTurns = Math.ceil(enemyHp / baseHeroAtk); // 3 turns
      const normalDamageTaken = (normalTurns - 1) * enemyAtk; // 2 attacks = 1M dmg

      // Chrono Surge combat: ATK is 1.2x (4.2M), enemy HP 10M
      const surgeHeroAtk = baseHeroAtk * mods.heroAtkMultiplier;
      const surgeTurns = Math.ceil(enemyHp / surgeHeroAtk); // ceil(10M / 4.2M) = 3 turns (or 2 if threshold met)

      // Test with hero ATK 4.5M (surge becomes 5.4M -> 2 turns!)
      const highHeroAtk = 4_500_000;
      const normalHighTurns = Math.ceil(enemyHp / highHeroAtk); // 3 turns (4.5M * 2 = 9M < 10M)
      const normalHighDmgTaken = (normalHighTurns - 1) * enemyAtk; // 1M dmg

      const surgeHighAtk = highHeroAtk * mods.heroAtkMultiplier; // 5.4M
      const surgeHighTurns = Math.ceil(enemyHp / surgeHighAtk); // 2 turns (5.4M * 2 = 10.8M >= 10M)
      const surgeHighDmgTaken = (surgeHighTurns - 1) * (enemyAtk * mods.damageTakenMultiplier); // 1 attack * 600k = 600k dmg!

      expect(surgeHighTurns).toBeLessThan(normalHighTurns);
      expect(surgeHighDmgTaken).toBeLessThan(normalHighDmgTaken);
    });
  });

  describe('Gravity Well: DEF Halving vs +50% Elemental Multiplication', () => {
    it('proves counter-elemental heroes gain overwhelming advantage (2.25x effective multiplier)', () => {
      const mods = resolveAnomalyModifiers('gravity_well', 'harness');

      const baseCounterElementMul = 1.5; // Fire vs Lightning
      const effectiveElementMul = baseCounterElementMul * mods.elementalBonusMultiplier;

      // 1.5 * 1.5 = 2.25x elemental multiplier
      expect(effectiveElementMul).toBe(2.25);

      // Hero with 10M ATK against 2M DEF boss
      const heroAtk = 10_000_000;
      const bossDef = 2_000_000;

      // Standard damage: (10M - 2M) * 1.5 = 12M
      const standardDmg = (heroAtk - bossDef) * baseCounterElementMul;

      // Gravity Well damage: (10M - (2M * 0.5)) * 2.25 = (10M - 1M) * 2.25 = 20.25M!
      const gravityBossDef = bossDef * mods.enemyDefMultiplier;
      const gravityDmg = (heroAtk - gravityBossDef) * effectiveElementMul;

      expect(gravityDmg).toBeGreaterThan(standardDmg * 1.6);
    });
  });

  describe('Quantum Phase: True Pierce Expected Value (EV)', () => {
    it('calculates higher expected value against high-DEF endgame guardians', () => {
      const mods = resolveAnomalyModifiers('quantum_phase', 'harness');
      const pierceRate = mods.pierceChance; // 0.25
      const missRate = mods.missChance; // 0.10
      const normalHitRate = 1.0 - pierceRate - missRate; // 0.65

      const heroAtk = 15_000_000;
      const guardianDef = 5_000_000;

      // Normal hit damage: 15M - 5M = 10M
      const normalHitDmg = heroAtk - guardianDef;

      // True pierce damage: 15M - 0 = 15M
      const pierceDmg = heroAtk;

      // Miss damage: 0
      const missDmg = 0;

      // Quantum EV per turn: (0.65 * 10M) + (0.25 * 15M) + (0.10 * 0) = 6.5M + 3.75M = 10.25M
      const quantumEV = normalHitRate * normalHitDmg + pierceRate * pierceDmg + missRate * missDmg;

      // Standard turn damage: 10M
      expect(quantumEV).toBeGreaterThan(normalHitDmg);
      expect(quantumEV).toBe(10_250_000);
    });
  });

  describe('Singularity Core & Collapse: High-Stakes Celestial Yield', () => {
    it('demonstrates super-exponential celestial yield scaling up to 4.5x', () => {
      const harnessMods = resolveAnomalyModifiers('singularity_core', 'harness');
      const collapseMods = resolveAnomalyModifiers('singularity_core', 'collapse');

      expect(harnessMods.rewardsMultiplier).toBe(3.0);
      expect(collapseMods.rewardsMultiplier).toBe(4.5);
      expect(collapseMods.guaranteedEssenceDrop).toBe(true);

      // 4.5x on a base 200 shard reward yields 900 shards
      const baseShards = 200;
      const yieldShards = Math.floor(baseShards * collapseMods.rewardsMultiplier);
      expect(yieldShards).toBe(900);
    });
  });

  describe('Stabilization: Safe Economic Return', () => {
    it('proves 5 shard cost is economically justified when base rewards exceed 25 shards', () => {
      const mods = resolveAnomalyModifiers('chrono_surge', 'stabilize');
      const shardCost = mods.shardsCost; // 5
      const bonusYieldPercent = mods.rewardsMultiplier - 1.0; // 0.20 (+20%)

      // Breakeven threshold: 5 / 0.20 = 25 shards
      const breakEvenBaseShards = shardCost / bonusYieldPercent;
      expect(breakEvenBaseShards).toBeCloseTo(25);

      // In Deep Rift (Depth 20+ yields ~60 shards), bonus shards = 60 * 0.20 = 12 > 5 cost!
      const deepRiftShards = 60;
      const netGain = deepRiftShards * mods.rewardsMultiplier - deepRiftShards - shardCost;
      expect(netGain).toBe(7); // +7 net shards profit
    });
  });
});
