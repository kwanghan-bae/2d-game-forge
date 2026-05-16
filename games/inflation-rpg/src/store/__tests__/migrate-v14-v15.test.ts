import { describe, it, expect } from 'vitest';
import { runStoreMigration } from '../gameStore';

describe('Persist v14 → v15 migration', () => {
  it('adds cycleHistory: [] to meta when migrating from v14', () => {
    const v14State = {
      run: { /* arbitrary v14 run state */ },
      meta: {
        characterLevels: {},
        // intentionally missing cycleHistory
      },
    };
    const migrated = runStoreMigration(v14State, 14) as { meta: Record<string, unknown> };
    expect(migrated.meta['cycleHistory']).toEqual([]);
  });

  it('preserves existing meta fields', () => {
    const v14State = {
      run: {},
      meta: {
        characterLevels: { K01: 5 },
        ascTier: 2,
      },
    };
    const migrated = runStoreMigration(v14State, 14) as { meta: Record<string, unknown> };
    expect((migrated.meta['characterLevels'] as Record<string, number>)['K01']).toBe(5);
    expect(migrated.meta['ascTier']).toBe(2);
  });

  it('is no-op when state already at v15', () => {
    const v15State = {
      meta: { cycleHistory: [{ endedAtMs: 1, durationMs: 100, maxLevel: 5, reason: 'bp_exhausted', seed: 1 }] },
    };
    const migrated = runStoreMigration(v15State, 15) as { meta: Record<string, unknown> };
    expect((migrated.meta['cycleHistory'] as unknown[]).length).toBe(1);
  });
});
