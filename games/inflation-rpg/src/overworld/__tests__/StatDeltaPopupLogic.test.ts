import { describe, it, expect } from 'vitest';
import { computeStatDeltas } from '../../components/StatDeltaPopupLogic';
import type { OverworldEvent } from '../OverworldEvents';

describe('StatDeltaPopupLogic', () => {
  it('extracts EXP gain from battle_won event', () => {
    const events: OverworldEvent[] = [
      { type: 'battle_won', enemyId: 'wolf_1', expGain: 50, dropId: null },
    ];
    const deltas = computeStatDeltas(events);
    expect(deltas).toContainEqual(
      expect.objectContaining({ stat: 'exp', value: 50, sign: '+' }),
    );
  });

  it('extracts level change from level_up event', () => {
    const events: OverworldEvent[] = [
      { type: 'level_up', from: 5, to: 6 },
    ];
    const deltas = computeStatDeltas(events);
    expect(deltas).toContainEqual(
      expect.objectContaining({ stat: 'level', value: 6, sign: '+' }),
    );
  });

  it('marks critical_hit events with isCrit flag', () => {
    const events: OverworldEvent[] = [
      { type: 'critical_hit', streak: 3 },
    ];
    const deltas = computeStatDeltas(events);
    expect(deltas).toContainEqual(
      expect.objectContaining({ stat: 'crit', value: 3, sign: '+', isCrit: true }),
    );
  });

  it('extracts gold from boss_vault event', () => {
    const events: OverworldEvent[] = [
      { type: 'boss_vault', gold: 200 },
    ];
    const deltas = computeStatDeltas(events);
    expect(deltas).toContainEqual(
      expect.objectContaining({ stat: 'gold', value: 200, sign: '+' }),
    );
  });

  it('returns empty array for unrecognized events', () => {
    const events: OverworldEvent[] = [
      { type: 'tick', t: 100 },
    ];
    const deltas = computeStatDeltas(events);
    expect(deltas).toEqual([]);
  });
});
