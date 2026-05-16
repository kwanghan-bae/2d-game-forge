import { describe, it, expect } from 'vitest';
import { runStoreMigration } from '../gameStore';
import { BASE_TRAIT_IDS } from '../../data/traits';

describe('Persist v15 → v16 migration', () => {
  it('adds traitsUnlocked: BASE_TRAIT_IDS to meta when migrating from v15', () => {
    const v15State = {
      run: {},
      meta: {
        characterLevels: {},
        cycleHistory: [],
      },
    };
    const migrated = runStoreMigration(v15State, 15);
    expect((migrated as { meta: Record<string, unknown> }).meta.traitsUnlocked).toEqual([...BASE_TRAIT_IDS]);
  });

  it('preserves existing meta fields', () => {
    const v15State = {
      run: {},
      meta: {
        characterLevels: { K01: 5 },
        cycleHistory: [{ endedAtMs: 1, durationMs: 100, maxLevel: 17, reason: 'bp_exhausted', seed: 42 }],
      },
    };
    const migrated = runStoreMigration(v15State, 15) as { meta: Record<string, unknown> };
    expect((migrated.meta.cycleHistory as unknown[]).length).toBe(1);
    expect((migrated.meta.characterLevels as Record<string, number>).K01).toBe(5);
  });

  it('is no-op when state already at v16 (has traitsUnlocked)', () => {
    const v16State = {
      meta: { traitsUnlocked: ['t_genius'] },
    };
    const migrated = runStoreMigration(v16State, 16) as { meta: Record<string, unknown> };
    expect(migrated.meta.traitsUnlocked).toEqual(['t_genius']);
  });
});
