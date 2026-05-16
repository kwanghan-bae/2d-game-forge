import { describe, it, expect } from 'vitest';
import { HeroDecisionAI } from '../HeroDecisionAI';

describe('HeroDecisionAI — Sim-B stub', () => {
  it('chooseTargetEnemyId picks the only enemy when one is alive', () => {
    const ai = new HeroDecisionAI([]);
    const choice = ai.chooseTargetEnemyId(['m1']);
    expect(choice).toBe('m1');
  });

  it('chooseTargetEnemyId returns null when no targets', () => {
    const ai = new HeroDecisionAI([]);
    expect(ai.chooseTargetEnemyId([])).toBeNull();
  });

  it('shouldRetreat returns false in Sim-B (placeholder)', () => {
    const ai = new HeroDecisionAI(['t_timid']);
    expect(ai.shouldRetreat({ heroHp: 10, heroHpMax: 100 })).toBe(false);
  });

  it('chooseSkillId returns null in Sim-B (no skill system wired yet)', () => {
    const ai = new HeroDecisionAI([]);
    expect(ai.chooseSkillId([])).toBeNull();
  });

  it('traits are stored and readable for future Sim-C wiring', () => {
    const ai = new HeroDecisionAI(['t_challenge', 't_genius']);
    expect(ai.getTraits()).toEqual(['t_challenge', 't_genius']);
  });
});
