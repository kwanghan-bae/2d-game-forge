import { describe, it, expect } from 'vitest';
import { runStoreMigration } from '../gameStore';

describe('Persist v14 → v15 migration', () => {
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
});
