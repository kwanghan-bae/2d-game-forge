import { describe, it, expect } from 'vitest';
import { getIdleMusing } from './idleMusings';
import { CHARACTERS } from './characters';

describe('Idle musings', () => {
  it('all 16 characters have musings', () => {
    for (const char of CHARACTERS) {
      expect(getIdleMusing(char.id), `${char.id}`).toBeTruthy();
    }
  });

  it('returns null for unknown', () => {
    expect(getIdleMusing('nobody')).toBeNull();
  });

  it('returns varied results (not always same)', () => {
    const results = new Set<string>();
    for (let i = 0; i < 30; i++) {
      results.add(getIdleMusing('hwarang')!);
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
