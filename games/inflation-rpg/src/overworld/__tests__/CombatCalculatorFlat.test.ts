import { describe, it, expect } from 'vitest';
import { computeHeroAtk, computeFlatAtk, type FlatAtkInput, type AtkComputeInput } from '../encounter/CombatCalculator';

describe('CombatCalculator.computeFlatAtk', () => {
  it('sums hero.atk + all flat bonus terms', () => {
    const input: FlatAtkInput = {
      heroAtk: 100,
      comboPrestigeFlat: 10,
      comboMilestoneBonus: 5,
      combatMastery: 3,
      waveChainAtk: 2,
      deathCountAtk: 1,
      dangerComboAtk: 4,
      comboAtkMilestone: 6,
    };
    expect(computeFlatAtk(input)).toBe(131); // 100+10+5+3+2+1+4+6
  });

  it('all bonuses at 0 → returns heroAtk only', () => {
    const input: FlatAtkInput = {
      heroAtk: 50,
      comboPrestigeFlat: 0,
      comboMilestoneBonus: 0,
      combatMastery: 0,
      waveChainAtk: 0,
      deathCountAtk: 0,
      dangerComboAtk: 0,
      comboAtkMilestone: 0,
    };
    expect(computeFlatAtk(input)).toBe(50);
  });
});
