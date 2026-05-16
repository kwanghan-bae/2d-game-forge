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

describe('HeroDecisionAI — §6.2 사냥터 선택 stubs (Sim-B)', () => {
  it('chooseEncounterNode picks first when nodes available (Sim-B stub)', () => {
    const ai = new HeroDecisionAI([]);
    expect(ai.chooseEncounterNode([{ id: 'n1' }, { id: 'n2' }])).toEqual({ id: 'n1' });
  });

  it('chooseEncounterNode returns null when no nodes', () => {
    const ai = new HeroDecisionAI([]);
    expect(ai.chooseEncounterNode([])).toBeNull();
  });

  it('chooseDungeon picks first when dungeons available (Sim-B stub)', () => {
    const ai = new HeroDecisionAI([]);
    expect(ai.chooseDungeon([{ id: 'd1' }, { id: 'd2' }])).toEqual({ id: 'd1' });
  });

  it('chooseDungeon returns null when no dungeons', () => {
    const ai = new HeroDecisionAI([]);
    expect(ai.chooseDungeon([])).toBeNull();
  });
});
