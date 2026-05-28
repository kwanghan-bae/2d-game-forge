import { describe, it, expect } from 'vitest';
import { MONSTER_LORE } from './monsterLore';
import { MONSTERS } from './monsters';

describe('monsterLore', () => {
  it('has lore for every monster', () => {
    const missing = MONSTERS.filter((m) => !MONSTER_LORE[m.id]);
    expect(missing.map((m) => m.id)).toEqual([]);
  });

  it('every lore entry maps to a real monster', () => {
    const monsterIds = new Set(MONSTERS.map((m) => m.id));
    const orphans = Object.keys(MONSTER_LORE).filter((id) => !monsterIds.has(id));
    expect(orphans).toEqual([]);
  });

  it('all lore entries are non-empty strings', () => {
    for (const [id, lore] of Object.entries(MONSTER_LORE)) {
      expect(lore.length, `${id} lore should be non-empty`).toBeGreaterThan(0);
    }
  });
});
