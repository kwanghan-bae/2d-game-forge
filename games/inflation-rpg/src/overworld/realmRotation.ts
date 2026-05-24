/**
 * Cycle-15 — realm rotation selector.
 *
 * Decides which realm a new cycle's hero spawns into based on the player's
 * accumulated meta progress (unlocked realms) and cycle history length.
 *
 * Until cycle-14, every cycle started in 'base' (cycleSliceV2.endCycle line 127
 * force-resets run.currentRealmId = 'base' as a stale-realm guard). With
 * `unlockedRealms` accumulating across cycles, that meant the player never saw
 * non-base realms at cycle start — directly contradicting V3's "영원한 영웅의
 * 다 차원 모험" identity.
 *
 * The stale-realm guard stays. Rotation is layered on top: cycleSliceV2.start()
 * calls `pickStartingRealm()` after run.currentRealmId has been reset to 'base'
 * and uses the result to override BOTH:
 *   1. store run.currentRealmId
 *   2. controller's internal currentRealmId + hero.gridX
 *
 * Both must move together — pathfinder bounds derive from realm.columnRange,
 * and a hero stranded at base-village col 1 with currentRealmId='sea' triggers
 * cycle-5 F1's '무위' 5세 즉사 instantly.
 *
 * ## Round-robin policy
 *
 * `pickStartingRealm(unlockedRealms, cycleNumber)` cycles linearly through
 * `unlockedRealms` using `cycleNumber % unlockedRealms.length`. This guarantees
 * PRD's "≥ 30% non-base start" the moment unlocked.length >= 2 (at 2 unlocked,
 * 50% non-base; at 4 unlocked, 75%).
 *
 * Single-realm players (cycle 1-N before any boss kill) stay on base — the
 * mod-1 case returns 'base' deterministically.
 */
import type { RealmId } from '../types';
import { findRealm } from '../data/realms';

/**
 * Round-robin selection of the starting realm for the next cycle.
 *
 * @param unlockedRealms accumulated across all prior cycles (meta.unlockedRealms).
 *   Always contains 'base' as the first element.
 * @param cycleNumber 0-based cycle index. Equivalent to `meta.sagaHistory.length`
 *   at the moment of `start()` — the saga for the about-to-start cycle has not
 *   been appended yet, so cycle 1 sees `cycleNumber=0`.
 */
export function pickStartingRealm(
  unlockedRealms: readonly RealmId[],
  cycleNumber: number,
): RealmId {
  if (unlockedRealms.length === 0) return 'base';
  const idx = Math.abs(cycleNumber) % unlockedRealms.length;
  return unlockedRealms[idx]!;
}

/**
 * Hero spawn gridX for a given realm. Always one column inside the realm's
 * `columnRange[0]` so the pathfinder's `columnBounds = realm.columnRange` does
 * not block the starting cell.
 *
 * Base realm preserves the legacy village col 1 (= columnRange[0] + 1).
 */
export function spawnColumnForRealm(realmId: RealmId): number {
  const realm = findRealm(realmId);
  return realm.columnRange[0] + 1;
}
