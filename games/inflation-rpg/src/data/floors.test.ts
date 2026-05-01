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

describe('getMonsterLevel', () => {
  it('floor 1..10: level = floor', () => {
    expect(getMonsterLevel(1)).toBe(1);
    expect(getMonsterLevel(2)).toBe(2);
    expect(getMonsterLevel(10)).toBe(10);
  });

  it('floor 11..30: level = floor(floor² / 5)', () => {
    expect(getMonsterLevel(11)).toBe(24);
    expect(getMonsterLevel(15)).toBe(45);
    expect(getMonsterLevel(20)).toBe(80);
    expect(getMonsterLevel(30)).toBe(180);
  });

  it('floor 31..100: level = floor(floor³ / 1000)', () => {
    expect(getMonsterLevel(31)).toBe(29);
    expect(getMonsterLevel(50)).toBe(125);
    expect(getMonsterLevel(100)).toBe(1000);
  });

  it('floor 100+: level = floor(L(100) × 2^((F - 100)/30))', () => {
    expect(getMonsterLevel(100)).toBe(1000);
    expect(getMonsterLevel(130)).toBe(2000);
    expect(getMonsterLevel(160)).toBe(4000);
    expect(getMonsterLevel(190)).toBe(8000);
  });

  it('throws or returns 1 for invalid floor (<= 0)', () => {
    expect(getMonsterLevel(0)).toBe(1);
    expect(getMonsterLevel(-5)).toBe(1);
  });
});

describe('getFloorInfo', () => {
  it('combines dungeonId + floor + level + bossType', () => {
    const info = getFloorInfo('plains', 5);
    expect(info).toEqual({
      dungeonId: 'plains',
      floorNumber: 5,
      monsterLevel: 5,
      bossType: 'mini',
    });
  });

  it('non-boss floor', () => {
    const info = getFloorInfo('forest', 7);
    expect(info).toEqual({
      dungeonId: 'forest',
      floorNumber: 7,
      monsterLevel: 7,
      bossType: null,
    });
  });

  it('deep floor — uses 100+ curve, sub-boss every 5', () => {
    const info = getFloorInfo('mountains', 130);
    expect(info.monsterLevel).toBe(2000);
    expect(info.bossType).toBe('sub');
  });
});
