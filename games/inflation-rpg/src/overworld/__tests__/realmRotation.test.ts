import { describe, it, expect } from 'vitest';
import { pickStartingRealm, spawnColumnForRealm } from '../realmRotation';
import type { RealmId } from '../../types';

describe('pickStartingRealm — cycle-15 round-robin', () => {
  it('single unlocked realm always returns base', () => {
    for (let n = 0; n < 10; n++) {
      expect(pickStartingRealm(['base'], n)).toBe('base');
    }
  });

  it('two unlocked realms alternate base ↔ sea', () => {
    expect(pickStartingRealm(['base', 'sea'], 0)).toBe('base');
    expect(pickStartingRealm(['base', 'sea'], 1)).toBe('sea');
    expect(pickStartingRealm(['base', 'sea'], 2)).toBe('base');
    expect(pickStartingRealm(['base', 'sea'], 3)).toBe('sea');
  });

  it('four unlocked realms cycle through all four in order', () => {
    const unlocked: RealmId[] = ['base', 'sea', 'volcano', 'underworld'];
    expect(pickStartingRealm(unlocked, 0)).toBe('base');
    expect(pickStartingRealm(unlocked, 1)).toBe('sea');
    expect(pickStartingRealm(unlocked, 2)).toBe('volcano');
    expect(pickStartingRealm(unlocked, 3)).toBe('underworld');
    expect(pickStartingRealm(unlocked, 4)).toBe('base');  // wraps
  });

  it('empty unlocked falls back to base (defensive)', () => {
    expect(pickStartingRealm([], 0)).toBe('base');
    expect(pickStartingRealm([], 99)).toBe('base');
  });

  it('non-base start frequency ≥ 30% for two-unlocked over 30 cycles', () => {
    let nonBase = 0;
    for (let n = 0; n < 30; n++) {
      if (pickStartingRealm(['base', 'sea'], n) !== 'base') nonBase += 1;
    }
    // 30 cycles, exactly 15 non-base = 50%.
    expect(nonBase / 30).toBeGreaterThanOrEqual(0.30);
  });

  it('handles negative cycleNumber defensively', () => {
    expect(pickStartingRealm(['base', 'sea'], -1)).toBe('sea');
    expect(pickStartingRealm(['base', 'sea'], -2)).toBe('base');
  });
});

describe('spawnColumnForRealm — gridX paired with realm.columnRange', () => {
  it('base spawn = 1 (preserves legacy village)', () => {
    expect(spawnColumnForRealm('base')).toBe(1);
  });

  it('sea spawn = 21 (columnRange[0]=20 + 1)', () => {
    expect(spawnColumnForRealm('sea')).toBe(21);
  });

  it('volcano spawn = 41', () => {
    expect(spawnColumnForRealm('volcano')).toBe(41);
  });

  it('chaos spawn = 101', () => {
    expect(spawnColumnForRealm('chaos')).toBe(101);
  });
});
