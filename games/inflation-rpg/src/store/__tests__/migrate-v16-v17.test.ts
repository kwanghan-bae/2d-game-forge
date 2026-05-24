import { describe, it, expect } from 'vitest';
import { runStoreMigration } from '../gameStore';

describe('Persist v16 → v17 migration', () => {
  it('adds sagaHistory: [] to meta on v16 → v17', () => {
    const v16State = { meta: { traitsUnlocked: [], cycleHistory: [] } };
    const migrated = runStoreMigration(v16State, 16);
    expect((migrated as { meta: { sagaHistory: unknown[] } }).meta.sagaHistory).toEqual([]);
  });

  it('no-op when already v17', () => {
    // Cycle-7 S1 (v23→v24): saga entry must have at least 1 event OR
    // finalLevel > 1 / finalAge > 5 / cause ≠ 자연사 to survive the new
    // stale-purge step. Bumping finalLevel to 2 keeps the entry alive
    // through the full chain while preserving this test's original
    // intent ("v16→v17 no-op when already v17").
    const v17State = { meta: { sagaHistory: [{ cycleId: 'c1', endedAtMs: 1, hero: { name: 'a', seed: 1, finalAge: 5, finalJob: '평민', finalLevel: 2, finalPersonality: { moral:0, prudent:0, heroic:0, merciful:0, pious:0 }, cause: '자연사' }, chapters: [], highlightEvents: [] }] } };
    const migrated = runStoreMigration(v17State, 17) as { meta: { sagaHistory: unknown[] } };
    expect(migrated.meta.sagaHistory.length).toBe(1);
  });
});
