import { describe, it, expect } from 'vitest';
import { DUNGEONS, getDungeonById, getStartDungeons } from './dungeons';
import { BOSSES } from './bosses';
import { MONSTERS } from './monsters';

describe('DUNGEONS catalog', () => {
  it('has 8 total dungeons (3 starter + 5 asc-tier)', () => {
    expect(DUNGEONS.length).toBe(8);
    const ids = DUNGEONS.map(d => d.id).sort();
    expect(ids).toEqual(['chaos', 'forest', 'heaven', 'mountains', 'plains', 'sea', 'underworld', 'volcano']);
  });

  it('first 3 dungeons are unlocked from the start', () => {
    const starters = DUNGEONS.slice(0, 3);
    for (const d of starters) {
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
  it('returns only 3 dungeons unlocked from start', () => {
    const start = getStartDungeons();
    expect(start.length).toBe(3);
    for (const d of start) {
      expect(d.unlockGate.type).toBe('start');
    }
  });
});

describe('Phase B-3β1 — Dungeon.bossIds', () => {
  it('every dungeon has bossIds with correct shape', () => {
    for (const d of DUNGEONS) {
      expect(d.bossIds).toBeDefined();
      expect(typeof d.bossIds.mini).toBe('string');
      expect(typeof d.bossIds.major).toBe('string');
      expect(d.bossIds.sub).toHaveLength(3);
      expect(typeof d.bossIds.final).toBe('string');
    }
  });

  it('every bossId references a real BOSSES entry', () => {
    const knownIds = new Set(BOSSES.map(b => b.id));
    const broken: string[] = [];
    for (const d of DUNGEONS) {
      const all = [d.bossIds.mini, d.bossIds.major, ...d.bossIds.sub, d.bossIds.final];
      for (const id of all) {
        if (!knownIds.has(id)) broken.push(`${d.id} -> ${id}`);
      }
    }
    expect(broken, `Dungeons reference undefined bosses: ${broken.join(', ')}`).toEqual([]);
  });

  it('plains dungeon bossIds match locked mapping', () => {
    const plains = getDungeonById('plains')!;
    expect(plains.bossIds.mini).toBe('plains-ghost');
    expect(plains.bossIds.major).toBe('spirit-post-guardian');
    expect(plains.bossIds.sub).toEqual(['cursed-plains', 'plains-lord', 'goblin-chief']);
    expect(plains.bossIds.final).toBe('gate-guardian');
  });

  it('forest dungeon final = chaos-god', () => {
    expect(getDungeonById('forest')!.bossIds.final).toBe('chaos-god');
  });

  it('mountains dungeon final = jade-emperor', () => {
    expect(getDungeonById('mountains')!.bossIds.final).toBe('jade-emperor');
  });
});

describe('Phase Realms — 5 new dungeons integrity', () => {
  const NEW_IDS = ['sea', 'volcano', 'underworld', 'heaven', 'chaos'];
  for (const id of NEW_IDS) {
    it(`dungeon ${id} exists with asc-tier gate`, () => {
      const d = DUNGEONS.find(x => x.id === id);
      expect(d).toBeDefined();
      expect(d?.unlockGate.type).toBe('asc-tier');
    });
    it(`dungeon ${id} all referenced boss IDs exist in BOSSES`, () => {
      const d = DUNGEONS.find(x => x.id === id)!;
      const bossIdSet = new Set(BOSSES.map(b => b.id));
      expect(bossIdSet.has(d.bossIds.mini)).toBe(true);
      expect(bossIdSet.has(d.bossIds.major)).toBe(true);
      for (const sub of d.bossIds.sub) expect(bossIdSet.has(sub)).toBe(true);
      expect(bossIdSet.has(d.bossIds.final)).toBe(true);
    });
    it(`dungeon ${id} all monster IDs exist in MONSTERS`, () => {
      const d = DUNGEONS.find(x => x.id === id)!;
      const monsterIdSet = new Set(MONSTERS.map(m => m.id));
      for (const m of d.monsterPool) expect(monsterIdSet.has(m)).toBe(true);
    });
  }
});
