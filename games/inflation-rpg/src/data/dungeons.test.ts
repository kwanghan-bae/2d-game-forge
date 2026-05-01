import { describe, it, expect } from 'vitest';
import { DUNGEONS, getDungeonById, getStartDungeons } from './dungeons';

describe('DUNGEONS catalog', () => {
  it('has the 3 starter dungeons', () => {
    expect(DUNGEONS.length).toBe(3);
    const ids = DUNGEONS.map(d => d.id).sort();
    expect(ids).toEqual(['forest', 'mountains', 'plains']);
  });

  it('all 3 starters are unlocked from the start', () => {
    for (const d of DUNGEONS) {
      expect(d.unlockGate.type).toBe('start');
    }
  });

  it('none are hard-only', () => {
    for (const d of DUNGEONS) {
      expect(d.isHardOnly).toBe(false);
    }
  });

  it('each has nameKR + emoji + themeColor', () => {
    for (const d of DUNGEONS) {
      expect(d.nameKR.length).toBeGreaterThan(0);
      expect(d.emoji.length).toBeGreaterThan(0);
      expect(d.themeColor).toMatch(/^#|var\(/);
    }
  });

  it('each has non-empty monster pool', () => {
    for (const d of DUNGEONS) {
      expect(d.monsterPool.length).toBeGreaterThan(0);
    }
  });
});

describe('getDungeonById', () => {
  it('returns dungeon for known id', () => {
    const d = getDungeonById('plains');
    expect(d).toBeDefined();
    expect(d!.nameKR).toBe('평야');
  });

  it('returns undefined for unknown id', () => {
    expect(getDungeonById('foobar')).toBeUndefined();
  });
});

describe('getStartDungeons', () => {
  it('returns only dungeons unlocked from start', () => {
    const start = getStartDungeons();
    expect(start.length).toBe(3);
    for (const d of start) {
      expect(d.unlockGate.type).toBe('start');
    }
  });
});
