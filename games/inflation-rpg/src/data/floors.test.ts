import { describe, it, expect } from 'vitest';
import { getFloorInfo, getBossType, getMonsterLevel } from './floors';

describe('getBossType', () => {
  it('returns null for non-boss floors', () => {
    expect(getBossType(1)).toBeNull();
    expect(getBossType(2)).toBeNull();
    expect(getBossType(11)).toBeNull();
    expect(getBossType(29)).toBeNull();
  });

  it('returns "mini" for floor 5', () => {
    expect(getBossType(5)).toBe('mini');
  });

  it('returns "major" for floor 10', () => {
    expect(getBossType(10)).toBe('major');
  });

  it('returns "sub" for floors 15, 20, 25', () => {
    expect(getBossType(15)).toBe('sub');
    expect(getBossType(20)).toBe('sub');
    expect(getBossType(25)).toBe('sub');
  });

  it('returns "final" for floor 30', () => {
    expect(getBossType(30)).toBe('final');
  });

  it('past floor 30 — boss types repeat in deep dungeon', () => {
    expect(getBossType(35)).toBe('sub');
    expect(getBossType(40)).toBe('sub');
    expect(getBossType(50)).toBe('sub');
  });
});

describe('getMonsterLevel — anchor exact values', () => {
  it('floor 1 → level 1', () => {
    expect(getMonsterLevel(1)).toBe(1);
  });

  it('floor 10 → level 10', () => {
    expect(getMonsterLevel(10)).toBe(10);
  });

  it('floor 30 → level 180', () => {
    expect(getMonsterLevel(30)).toBe(180);
  });

  it('floor 100 → level 1000', () => {
    expect(getMonsterLevel(100)).toBe(1000);
  });

  it('floor 200 → level 10,000', () => {
    expect(getMonsterLevel(200)).toBe(10_000);
  });

  it('floor 500 → level 100,000', () => {
    expect(getMonsterLevel(500)).toBe(100_000);
  });

  it('floor 1000 → level 1,000,000', () => {
    expect(getMonsterLevel(1000)).toBe(1_000_000);
  });
});

describe('getMonsterLevel — past 1000 (×10 every 500)', () => {
  it('floor 1500 → 10M', () => {
    expect(getMonsterLevel(1500)).toBe(10_000_000);
  });

  it('floor 2000 → 100M', () => {
    expect(getMonsterLevel(2000)).toBe(100_000_000);
  });
});

describe('getMonsterLevel — interpolation properties', () => {
  it('monotonic non-decreasing across floors 1..1000', () => {
    let prev = 0;
    for (let f = 1; f <= 1000; f++) {
      const lv = getMonsterLevel(f);
      expect(lv).toBeGreaterThanOrEqual(prev);
      prev = lv;
    }
  });

  it('continuous at floor 30 boundary (no cliff)', () => {
    // Old curve had 180 → 29 cliff. New curve must keep going up smoothly.
    expect(getMonsterLevel(30)).toBe(180);
    const f31 = getMonsterLevel(31);
    expect(f31).toBeGreaterThanOrEqual(180);
    expect(f31).toBeLessThan(200);
  });

  it('floor 50 is between anchors 30 (180) and 100 (1000)', () => {
    const lv = getMonsterLevel(50);
    expect(lv).toBeGreaterThan(180);
    expect(lv).toBeLessThan(1000);
  });

  it('floor 130 ≈ 1995 (segment 100..200, geometric)', () => {
    expect(getMonsterLevel(130)).toBe(1995);
  });

  it('returns 1 for invalid floor (<= 0)', () => {
    expect(getMonsterLevel(0)).toBe(1);
    expect(getMonsterLevel(-5)).toBe(1);
  });
});

describe('getFloorInfo', () => {
  it('combines dungeonId + floor + level + bossType', () => {
    const info = getFloorInfo('plains', 30);
    expect(info).toEqual({
      dungeonId: 'plains',
      floorNumber: 30,
      monsterLevel: 180,
      bossType: 'final',
    });
  });

  it('non-boss floor', () => {
    const info = getFloorInfo('forest', 7);
    expect(info.dungeonId).toBe('forest');
    expect(info.floorNumber).toBe(7);
    expect(info.bossType).toBeNull();
    expect(info.monsterLevel).toBeGreaterThan(0);
  });

  it('deep floor 130 — geometric segment 100..200, sub-boss every 5', () => {
    const info = getFloorInfo('mountains', 130);
    expect(info.monsterLevel).toBe(1995);
    expect(info.bossType).toBe('sub');
  });
});
