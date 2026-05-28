import { describe, it, expect } from 'vitest';
import { getAllSkills } from './skills';
import type { ActiveSkill } from '../types';

/**
 * Skill balance sim — verifies all skills have reasonable DPS efficiency
 * and no outlier dominates the pool.
 */

function dpsEfficiency(skill: ActiveSkill): number {
  const e = skill.effect;
  switch (e.type) {
    case 'multi_hit':
      return (e.multiplier * e.targets) / skill.cooldownSec;
    case 'aoe':
      return (e.multiplier * e.targets) / skill.cooldownSec;
    case 'execute':
      // Execute value = roughly 2x single hit equivalent scaled by threshold
      return (2 / e.executeThreshold) / skill.cooldownSec;
    case 'heal':
      // Heal value = healPercent as a "virtual damage prevented" equivalent
      return (e.healPercent / 10) / skill.cooldownSec;
    case 'buff':
      // Buff value = buffPercent * duration / cooldown (uptime-adjusted power)
      return (e.buffPercent * e.buffDurationSec / 100) / skill.cooldownSec;
    default:
      return 0;
  }
}

describe('skill balance', () => {
  const skills = getAllSkills();

  it('all 32 skills are defined', () => {
    expect(skills).toHaveLength(32);
  });

  it('no skill has DPS efficiency > 4× the median', () => {
    const efficiencies = skills.map(dpsEfficiency).sort((a, b) => a - b);
    const median = efficiencies[Math.floor(efficiencies.length / 2)]!;
    const max = efficiencies[efficiencies.length - 1]!;
    // Max should not exceed 4× median — ensures no single skill dominates
    expect(max).toBeLessThan(median * 4);
  });

  it('cooldowns are within 5–20 second range', () => {
    for (const skill of skills) {
      expect(skill.cooldownSec).toBeGreaterThanOrEqual(5);
      expect(skill.cooldownSec).toBeLessThanOrEqual(20);
    }
  });

  it('damage multipliers are within 1–4× range', () => {
    for (const skill of skills) {
      if (skill.effect.type === 'multi_hit' || skill.effect.type === 'aoe') {
        expect(skill.effect.multiplier).toBeGreaterThanOrEqual(1);
        expect(skill.effect.multiplier).toBeLessThanOrEqual(4);
      }
    }
  });
});
