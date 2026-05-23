import type { Chapter } from '../hero/HeroLifecycle';

/** Semantic enemy zone — column bands used by mapLayout + respawn.
 *  Aligns with `ZoneId` but only the three that host enemies. */
export const ENEMY_ZONES = ['forest', 'plains', 'mountains'] as const;
export type EnemyZone = (typeof ENEMY_ZONES)[number];

/** Zone × chapter → landmark TYPE id. The hero advances along the chapter
 *  axis as BP drains while staying within a zone column band. Initial
 *  placement (mapLayout) uses the 어린시절 column; respawn taps the row
 *  matching the hero's current chapter. */
export const ENEMY_TIER_MATRIX: Record<EnemyZone, Record<Chapter, string>> = {
  forest: {
    '어린시절': 'wolf',
    '청년기':   'dire_wolf',
    '장년기':   'shadow_beast',
    '노년기':   'nightmare_stalker',
    '마지막':   'nightmare_stalker',
  },
  plains: {
    '어린시절': 'bandit',
    '청년기':   'brigand',
    '장년기':   'warlord',
    '노년기':   'dark_knight',
    '마지막':   'dark_knight',
  },
  mountains: {
    '어린시절': 'goblin',
    '청년기':   'ogre',
    '장년기':   'troll',
    '노년기':   'demon_warrior',
    '마지막':   'demon_warrior',
  },
};

/** Column band → enemy zone. Mirrors mapLayout's tile bands. */
export function zoneForColumn(x: number): EnemyZone | null {
  if (x >= 3  && x <= 7)  return 'forest';
  if (x >= 8  && x <= 11) return 'plains';
  if (x >= 12 && x <= 16) return 'mountains';
  return null;
}

export function selectEnemyTypeId(zone: EnemyZone, chapter: Chapter): string {
  return ENEMY_TIER_MATRIX[zone][chapter];
}
