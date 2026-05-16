import type { MetaState, Dungeon } from '../types';

/**
 * Phase Realms — dungeon unlock predicate.
 * - start: always available.
 * - asc-tier: requires meta.ascTier >= gate.tier.
 * - boss-count: requires count of normalBossesKilled >= gate.count.
 * - hardmode: requires meta.hardModeUnlocked.
 */
export function isDungeonUnlocked(meta: MetaState, dungeon: Dungeon): boolean {
  const gate = dungeon.unlockGate;
  switch (gate.type) {
    case 'start':       return true;
    case 'asc-tier':    return meta.ascTier >= gate.tier;
    case 'boss-count':  return (meta.normalBossesKilled?.length ?? 0) >= gate.count;
    case 'hardmode':    return meta.hardModeUnlocked === true;
  }
}
