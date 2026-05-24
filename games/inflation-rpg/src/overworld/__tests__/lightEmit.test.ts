import { describe, expect, it } from 'vitest';
import type { OverworldEvent } from '../OverworldEvents';
import { computeLightDelta } from '../lightEmit';

describe('computeLightDelta', () => {
  it('empty events → 0', () => {
    const result = computeLightDelta([], 'enemy');
    expect(result.delta).toBe(0);
    expect(result.breakdown).toEqual([]);
  });

  it('battle_won (enemy, no drop) → 1', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'e1', expGain: 10, dropId: null },
    ];
    const r = computeLightDelta(evs, 'enemy');
    expect(r.delta).toBe(1);
  });

  it('battle_won (boss, no drop) → 10', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'b1', expGain: 100, dropId: null },
    ];
    const r = computeLightDelta(evs, 'boss');
    expect(r.delta).toBe(10);
  });

  it('battle_won (enemy + drop) → 1 + 0.5 = 1.5', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'e1', expGain: 10, dropId: 'iron_sword' },
    ];
    const r = computeLightDelta(evs, 'enemy');
    expect(r.delta).toBe(1.5);
  });

  it('battle_won (boss + drop) → 10 + 0.5 = 10.5', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'b1', expGain: 100, dropId: 'rare_axe' },
    ];
    const r = computeLightDelta(evs, 'boss');
    expect(r.delta).toBe(10.5);
  });

  it('5 level_up events → 5 × 0.5 = 2.5', () => {
    const evs: OverworldEvent[] = Array.from({ length: 5 }, (_, i) => ({
      type: 'level_up' as const, from: i, to: i + 1,
    }));
    const r = computeLightDelta(evs, 'enemy');
    expect(r.delta).toBe(2.5);
  });

  it('shrine_visited / skill_learned / job_unlocked each +1', () => {
    const evs: OverworldEvent[] = [
      { type: 'shrine_visited', landmarkId: 'sh1', healed: 100 },
      { type: 'skill_learned', skillId: 's1', skillNameKR: '풍참', atkBefore: 50, atkAfter: 60 },
      { type: 'job_unlocked', jobId: 'j1', jobNameKR: '용병', tier: 1 },
    ];
    const r = computeLightDelta(evs, 'shrine');
    expect(r.delta).toBe(3);
  });

  it('excluded events emit 0 (moral_choice, chapter_transition, hero_died, tick, arrived_at, battle_started, cycle_ended)', () => {
    const evs: OverworldEvent[] = [
      { type: 'moral_choice', choice: 'mercy', dim: 'merciful', delta: 1, nameKR: '자비' },
      { type: 'chapter_transition', fromChapter: '어린시절', toChapter: '청년기', atAge: 15 },
      { type: 'hero_died', cause: '전사', oldLevel: 10, newLevel: 9 },
      { type: 'tick', t: 1 },
      { type: 'arrived_at', landmarkId: 'l1', landmarkKind: 'enemy' },
      { type: 'battle_started', enemyId: 'e1' },
      { type: 'cycle_ended' },
    ];
    const r = computeLightDelta(evs, 'enemy');
    expect(r.delta).toBe(0);
  });

  it('combined arrival (battle + drop + 3 level_ups) → 1 + 0.5 + 1.5 = 3', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'e1', expGain: 30, dropId: 'iron_sword' },
      { type: 'level_up', from: 1, to: 2 },
      { type: 'level_up', from: 2, to: 3 },
      { type: 'level_up', from: 3, to: 4 },
    ];
    const r = computeLightDelta(evs, 'enemy');
    expect(r.delta).toBe(3);
  });

  it('breakdown contains source labels', () => {
    const evs: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'e1', expGain: 10, dropId: 'iron_sword' },
    ];
    const r = computeLightDelta(evs, 'enemy');
    const sources = r.breakdown.map(b => b.source);
    expect(sources).toContain('kill');
    expect(sources).toContain('drop');
  });
});
