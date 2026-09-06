import { describe, it, expect } from 'vitest';
import {
  ANOMALIES,
  resolveAnomalyModifiers,
  rollSpacetimeAnomaly,
  type SpacetimeAnomalyType,
} from './spacetimeAnomaly';

describe('spacetimeAnomaly engine (C1111)', () => {
  const anomalyKeys: SpacetimeAnomalyType[] = [
    'chrono_surge',
    'gravity_well',
    'quantum_phase',
    'singularity_core',
  ];

  it('defines 4 valid spacetime anomalies with complete descriptors', () => {
    anomalyKeys.forEach((key) => {
      const def = ANOMALIES[key];
      expect(def).toBeDefined();
      expect(def.type).toBe(key);
      expect(def.nameKR.length).toBeGreaterThan(0);
      expect(def.hanja.length).toBeGreaterThan(0);
      expect(def.emoji.length).toBeGreaterThan(0);
      expect(def.description.length).toBeGreaterThan(10);
      expect(def.positiveModifierDesc.length).toBeGreaterThan(5);
      expect(def.negativeModifierDesc.length).toBeGreaterThan(5);
    });
  });

  describe('Tactical Resolution: stabilize', () => {
    it('costs 5 shards, eliminates all negatives, and grants safe buffs', () => {
      anomalyKeys.forEach((key) => {
        const mods = resolveAnomalyModifiers(key, 'stabilize');
        expect(mods.shardsCost).toBe(5);
        expect(mods.heroAtkMultiplier).toBe(1.15);
        expect(mods.heroDefMultiplier).toBe(1.15);
        expect(mods.damageTakenMultiplier).toBe(1.0);
        expect(mods.missChance).toBe(0);
        expect(mods.rewardsMultiplier).toBe(1.2);
        expect(mods.guaranteedEssenceDrop).toBe(false);
      });
    });
  });

  describe('Tactical Resolution: harness', () => {
    it('applies Chrono Surge speed & damage taken modifiers', () => {
      const mods = resolveAnomalyModifiers('chrono_surge', 'harness');
      expect(mods.heroAtkMultiplier).toBe(1.20);
      expect(mods.damageTakenMultiplier).toBe(1.20);
      expect(mods.shardsCost).toBe(0);
    });

    it('applies Gravity Well DEF halving and elemental boost', () => {
      const mods = resolveAnomalyModifiers('gravity_well', 'harness');
      expect(mods.elementalBonusMultiplier).toBe(1.50);
      expect(mods.heroDefMultiplier).toBe(0.50);
      expect(mods.enemyDefMultiplier).toBe(0.50);
    });

    it('applies Quantum Phase pierce and miss chances', () => {
      const mods = resolveAnomalyModifiers('quantum_phase', 'harness');
      expect(mods.pierceChance).toBe(0.25);
      expect(mods.missChance).toBe(0.10);
    });

    it('applies Singularity Core 3x loot and 1.5x enemy ATK', () => {
      const mods = resolveAnomalyModifiers('singularity_core', 'harness');
      expect(mods.enemyAtkMultiplier).toBe(1.50);
      expect(mods.rewardsMultiplier).toBe(3.0);
    });
  });

  describe('Tactical Resolution: collapse', () => {
    it('amplifies risk and guarantees dimensional essence drop', () => {
      const mods = resolveAnomalyModifiers('singularity_core', 'collapse');
      expect(mods.guaranteedEssenceDrop).toBe(true);
      expect(mods.enemyAtkMultiplier).toBe(1.95); // 1.50 * 1.30 = 1.95
      expect(mods.rewardsMultiplier).toBe(4.5); // 3.0 * 1.5 = 4.5
    });
  });

  describe('rollSpacetimeAnomaly', () => {
    it('deterministically rolls an anomaly from seed', () => {
      const a0 = rollSpacetimeAnomaly(0);
      const a1 = rollSpacetimeAnomaly(1);
      const a4 = rollSpacetimeAnomaly(4);

      expect(a0.type).toBe('chrono_surge');
      expect(a1.type).toBe('gravity_well');
      expect(a4.type).toBe('chrono_surge');
    });
  });
});
