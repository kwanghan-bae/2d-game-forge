import { DUNGEONS } from '../data/dungeons';
import { COMPASS_ITEMS, ALL_COMPASS_IDS, getCompassByDungeon } from '../data/compass';
import type { MetaState, Dungeon } from '../types';

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

/**
 * Returns the weighted draw multiplier for a dungeon.
 * Owning the first-tier compass for that dungeon triples its weight; otherwise 1.
 */
export function getDungeonWeight(meta: MetaState, dungeonId: string): number {
  return meta.compassOwned[getCompassByDungeon(dungeonId, 1)] ? 3 : 1;
}

/**
 * Returns true if the player can freely select this dungeon without a random draw.
 * Requires either the omni compass or the second-tier compass for this specific dungeon.
 */
export function canFreeSelect(meta: MetaState, dungeonId: string): boolean {
  return !!(meta.compassOwned.omni || meta.compassOwned[getCompassByDungeon(dungeonId, 2)]);
}

/**
 * Returns true if the player has free-select rights for at least one dungeon.
 */
export function hasAnyFreeSelect(meta: MetaState): boolean {
  if (meta.compassOwned.omni) return true;
  return ALL_COMPASS_IDS.some(
    (id) => COMPASS_ITEMS[id].tier === 2 && meta.compassOwned[id]
  );
}

/**
 * Picks a random dungeon from the provided list using weighted random selection.
 * Dungeons with the first-tier compass have 3× weight; others have 1× weight.
 * Accepts an injectable rng function (default: Math.random) for deterministic testing.
 */
export function pickRandomDungeon(
  meta: MetaState,
  dungeons: readonly Dungeon[],
  rng: () => number = Math.random
): string {
  const weights = dungeons.map((d) => getDungeonWeight(meta, d.id));
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < dungeons.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return dungeons[i]!.id;
  }
  return dungeons[dungeons.length - 1]!.id;
}
