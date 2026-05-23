import { describe, expect, it } from 'vitest';
import type { RealmId } from '../../types';
import { canEnterRealm, fieldLevelAtColumn, realmForColumn, nextRealmOf } from '../zoneNavigation';

describe('canEnterRealm', () => {
  it('base always enterable', () => {
    expect(canEnterRealm(['base'], 'base')).toBe(true);
  });
  it('sea requires unlock', () => {
    expect(canEnterRealm(['base'], 'sea')).toBe(false);
    expect(canEnterRealm(['base', 'sea'], 'sea')).toBe(true);
  });
});

describe('realmForColumn', () => {
  it('column 0-19 → base', () => {
    expect(realmForColumn(0)).toBe('base');
    expect(realmForColumn(19)).toBe('base');
  });
  it('column 20-39 → sea', () => {
    expect(realmForColumn(20)).toBe('sea');
    expect(realmForColumn(39)).toBe('sea');
  });
  it('column 100-119 → chaos', () => {
    expect(realmForColumn(100)).toBe('chaos');
    expect(realmForColumn(119)).toBe('chaos');
  });
  it('out-of-range → null', () => {
    expect(realmForColumn(-1)).toBeNull();
    expect(realmForColumn(120)).toBeNull();
  });
});

describe('fieldLevelAtColumn', () => {
  it('base col 0 → 1, col 19 → ~50', () => {
    expect(fieldLevelAtColumn('base', 0)).toBe(1);
    expect(fieldLevelAtColumn('base', 19)).toBeGreaterThanOrEqual(45);
    expect(fieldLevelAtColumn('base', 19)).toBeLessThanOrEqual(50);
  });
  it('sea col 20 → 50, col 39 → ~500', () => {
    expect(fieldLevelAtColumn('sea', 20)).toBe(50);
    expect(fieldLevelAtColumn('sea', 39)).toBeGreaterThanOrEqual(450);
    expect(fieldLevelAtColumn('sea', 39)).toBeLessThanOrEqual(500);
  });
  it('chaos col 119 → very large', () => {
    expect(fieldLevelAtColumn('chaos', 119)).toBeGreaterThan(1_000_000);
  });
});

describe('nextRealmOf', () => {
  it('base → sea', () => expect(nextRealmOf('base')).toBe('sea'));
  it('chaos → null', () => expect(nextRealmOf('chaos')).toBeNull());
});
