import { describe, it, expect } from 'vitest';
import type { CycleEvent, CycleState, CycleResult, CycleHistoryEntry } from '../cycleEvents';

describe('cycleEvents — type shape', () => {
  it('CycleEvent discriminated union covers all Sim-A event types', () => {
    const events: CycleEvent[] = [
      { t: 0, type: 'cycle_start', loadoutHash: 'h', seed: 42, characterId: 'K01', traitIds: [] },
      { t: 1, type: 'battle_start', enemyId: 'm1', isBoss: false, heroLv: 1, heroHp: 100, enemyHp: 50 },
      { t: 2, type: 'hero_hit', enemyId: 'm1', damage: 10, remaining: 40 },
      { t: 3, type: 'enemy_hit', enemyId: 'm1', damage: 5, remaining: 95 },
      { t: 4, type: 'enemy_kill', enemyId: 'm1', expGain: 100, goldGain: 10, dropIds: [] },
      { t: 5, type: 'level_up', from: 1, to: 2, statDelta: { hp: 10, atk: 2 } },
      { t: 6, type: 'bp_change', delta: -1, remaining: 29, cause: 'encounter' },
      { t: 7, type: 'cycle_end', reason: 'bp_exhausted', durationMs: 1000, maxLevel: 2, finalState: {} },
    ];
    expect(events.length).toBe(8);
  });

  it('CycleState fields are exported', () => {
    const state: CycleState = {
      tNowMs: 0,
      characterId: 'K01',
      seed: 42,
      heroLv: 1,
      heroExp: 0,
      heroHp: 100,
      heroHpMax: 100,
      bp: 30,
      bpMax: 30,
      currentFloor: 1,
      cumKills: 0,
      cumGold: 0,
      drops: {},
      ended: false,
    };
    expect(state.bp).toBe(30);
  });

  it('CycleResult fields are exported', () => {
    const result: CycleResult = {
      durationMs: 0,
      maxLevel: 1,
      levelCurve: [],
      expCurve: [],
      bpCurve: [],
      kills: { total: 0, byEnemyId: {}, bossKills: 0 },
      drops: { byItemId: {}, rarityHistogram: {} },
      reason: 'bp_exhausted',
    };
    expect(result.maxLevel).toBe(1);
  });

  it('CycleHistoryEntry has trimmed shape for meta persist', () => {
    const entry: CycleHistoryEntry = {
      endedAtMs: Date.now(),
      durationMs: 1000,
      maxLevel: 1,
      reason: 'bp_exhausted',
      seed: 42,
    };
    expect(entry.seed).toBe(42);
  });
});
