import { describe, it, expect, beforeEach } from 'vitest';
import { updateRecord, getRecord, resetRecord } from './battleRecords';

describe('Battle records', () => {
  beforeEach(() => resetRecord());

  it('tracks max DPS', () => {
    updateRecord({ maxDps: 100 });
    updateRecord({ maxDps: 50 }); // lower, ignored
    expect(getRecord().maxDps).toBe(100);
  });

  it('tracks max kill streak', () => {
    updateRecord({ maxKillStreak: 5 });
    updateRecord({ maxKillStreak: 12 });
    expect(getRecord().maxKillStreak).toBe(12);
  });

  it('tracks fastest kill (minimum)', () => {
    updateRecord({ fastestKillMs: 3000 });
    updateRecord({ fastestKillMs: 1500 });
    updateRecord({ fastestKillMs: 2000 });
    expect(getRecord().fastestKillMs).toBe(1500);
  });

  it('accumulates total kills and damage', () => {
    updateRecord({ totalKills: 3, totalDamage: 1000 });
    updateRecord({ totalKills: 5, totalDamage: 2500 });
    expect(getRecord().totalKills).toBe(8);
    expect(getRecord().totalDamage).toBe(3500);
  });
});
