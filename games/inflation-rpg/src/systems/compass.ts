import { DUNGEONS } from '../data/dungeons';
import { getCompassByDungeon } from '../data/compass';
import type { MetaState, CompassId } from '../types';

/**
 * Returns a partial-state patch (delta only).
 * `compassOwned` contains only the newly-set keys; the caller merges with existing state.
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
  const compassDelta: Partial<Record<CompassId, boolean>> = { [compassId]: true };
  if (allClear) compassDelta.omni = true;
  return {
    compassOwned: compassDelta as Record<CompassId, boolean>,
    dungeonMiniBossesCleared: newCleared,
  };
}

/**
 * Returns a partial-state patch (delta only).
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
    compassOwned: { [compassId]: true } as Record<CompassId, boolean>,
    dungeonMajorBossesCleared: [...meta.dungeonMajorBossesCleared, dungeonId],
  };
}
