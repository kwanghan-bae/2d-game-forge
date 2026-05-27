import { describe, it, expect } from 'vitest';
import { rollTrait, TRAIT_ROLL_MILESTONES, TRAIT_ROLL_CHANCE } from '../TraitRoller';
import { SeededRng } from '../../cycle/SeededRng';

describe('Cycle 282 — Sub-phase σ T2: TraitRoller', () => {
  it('milestone 외 level 은 null', () => {
    const rng = new SeededRng(1);
    expect(rollTrait(rng, [], 1)).toBeNull();
    expect(rollTrait(rng, [], 2)).toBeNull();
    expect(rollTrait(rng, [], 7)).toBeNull();
    expect(rollTrait(rng, [], 100)).toBeNull();
  });

  it('milestone level 의 chance 가 ~30% (large N)', () => {
    let hits = 0;
    const N = 1000;
    for (let i = 0; i < N; i++) {
      const rng = new SeededRng(i);
      const result = rollTrait(rng, [], 5);
      if (result !== null) hits++;
    }
    const ratio = hits / N;
    // 가드 = TRAIT_ROLL_CHANCE ±5%p (noise band).
    expect(ratio).toBeGreaterThan(TRAIT_ROLL_CHANCE - 0.05);
    expect(ratio).toBeLessThan(TRAIT_ROLL_CHANCE + 0.05);
  });

  it('중복 방지 — existingTraits 풀에서 제외', () => {
    // 풀 16 중 15 existing → available 1
    const ALL_BUT_LUCKY = [
      't_challenge', 't_timid', 't_thrill', 't_genius', 't_fragile',
      't_terminal_genius', 't_explorer', 't_berserker', 't_miser', 't_boss_hunter',
      't_fortune', 't_zealot', 't_swift', 't_iron', 't_prodigy',
    ] as const;
    // chance 통과 시 1 남은 = t_lucky 만 가능
    for (let i = 0; i < 100; i++) {
      const rng = new SeededRng(i);
      const result = rollTrait(rng, ALL_BUT_LUCKY, 5);
      if (result !== null) {
        expect(result).toBe('t_lucky');
      }
    }
  });

  it('모든 trait 보유 시 null (풀 소진)', () => {
    const ALL = [
      't_challenge', 't_timid', 't_thrill', 't_genius', 't_fragile',
      't_terminal_genius', 't_explorer', 't_berserker', 't_miser', 't_boss_hunter',
      't_fortune', 't_zealot', 't_swift', 't_iron', 't_prodigy', 't_lucky',
    ] as const;
    for (let i = 0; i < 50; i++) {
      const rng = new SeededRng(i);
      const result = rollTrait(rng, ALL, 5);
      expect(result).toBeNull();
    }
  });

  it('TRAIT_ROLL_MILESTONES = 5 milestones (5/15/30/50/80)', () => {
    expect([...TRAIT_ROLL_MILESTONES]).toEqual([5, 15, 30, 50, 80]);
  });
});
