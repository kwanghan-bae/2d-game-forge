import { describe, it, expect } from 'vitest';
import { runStoreMigration } from '../gameStore';

describe('Persist v16 → v17 migration', () => {
  it('adds sagaHistory: [] to meta on v16 → v17', () => {
    const v16State = { meta: { traitsUnlocked: [], cycleHistory: [] } };
    const migrated = runStoreMigration(v16State, 16);
    expect((migrated as { meta: { sagaHistory: unknown[] } }).meta.sagaHistory).toEqual([]);
  });

  it('preserves existing meta on v16 → v17', () => {
    const v16State = {
      meta: {
        traitsUnlocked: ['t_genius'],
        cycleHistory: [{ endedAtMs: 1, durationMs: 100, maxLevel: 17, reason: 'bp_exhausted', seed: 42 }],
      },
    };
    const migrated = runStoreMigration(v16State, 16) as { meta: { traitsUnlocked: string[]; cycleHistory: unknown[] } };
    expect(migrated.meta.traitsUnlocked).toEqual(['t_genius']);
    expect(migrated.meta.cycleHistory.length).toBe(1);
  });

  it('no-op when already v17', () => {
    const v17State = { meta: { sagaHistory: [{ cycleId: 'c1', endedAtMs: 1, hero: { name: 'a', seed: 1, finalAge: 5, finalJob: '평민', finalLevel: 1, finalPersonality: { moral:0, prudent:0, heroic:0, merciful:0, pious:0 }, cause: '자연사' }, chapters: [], highlightEvents: [] }] } };
    const migrated = runStoreMigration(v17State, 17) as { meta: { sagaHistory: unknown[] } };
    expect(migrated.meta.sagaHistory.length).toBe(1);
  });
});
