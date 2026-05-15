import { DUNGEONS } from '../data/dungeons';
import { getCompassByDungeon } from '../data/compass';
import type { MetaState } from '../types';

/**
 * Returns a partial-state patch with the FULL new compassOwned object (spec §3.2).
 * Full spread ensures Task 5 store's shallow merge does not lose existing compass data.
 * Returns null if the dungeon was already cleared (idempotent guard).
 */
export function awardMiniBossCompass(
  meta: MetaState,
  dungeonId: string
): Partial<MetaState> | null {
  if (meta.dungeonMiniBossesCleared.includes(dungeonId)) return null;
  const compassId = getCompassByDungeon(dungeonId, 1);
  const newCleared = [...meta.dungeonMiniBossesCleared, dungeonId];
  const allClear = newCleared.length >= DUNGEONS.length;
  return {
    compassOwned: {
      ...meta.compassOwned,
      [compassId]: true,
      ...(allClear ? { omni: true } : {}),
    },
    dungeonMiniBossesCleared: newCleared,
  };
}

/**
 * Returns a partial-state patch with the FULL new compassOwned object (spec §3.2).
 * Major-boss compasses never trigger the omni bonus.
 * Returns null if the dungeon was already cleared (idempotent guard).
 */
export function awardMajorBossCompass(
  meta: MetaState,
  dungeonId: string
): Partial<MetaState> | null {
  if (meta.dungeonMajorBossesCleared.includes(dungeonId)) return null;
  const compassId = getCompassByDungeon(dungeonId, 2);
  return {
    compassOwned: {
      ...meta.compassOwned,
      [compassId]: true,
    },
    dungeonMajorBossesCleared: [...meta.dungeonMajorBossesCleared, dungeonId],
  };
}
