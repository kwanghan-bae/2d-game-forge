import type { LandmarkType, LandmarkKind } from '../data/landmarks';
import { findRealm } from '../data/realms';
import type { RealmId } from '../types';
export interface PlacedLandmark {
  instanceId: string;
  type: LandmarkType;
  gridX: number;
  gridY: number;
  consumed: boolean; // enemies/bosses become consumed after defeat
}

export function landmarkToCandidate(l: PlacedLandmark, realmId?: RealmId): { id: string; kind: LandmarkKind; difficulty: number } {
  if (realmId) {
    const realm = findRealm(realmId);
    const baseLevel = realm.fieldLevelRange[0];
    const kind = l.type.kind;
    // C737: realm-based difficulty. Boss = realm start level, enemy = half, non-combat = 0
    const difficulty = kind === 'boss' ? baseLevel
      : kind === 'enemy' ? Math.floor(baseLevel * 0.5)
      : 0;
    return { id: l.instanceId, kind, difficulty };
  }
  // Legacy fallback (no realm context)
  const difficulty = l.type.kind === 'boss' ? 3 : 1;
  return { id: l.instanceId, kind: l.type.kind, difficulty };
}

/** Cycle-8 C1 + Cycle-9 R2: filter target candidates by hero's current realm
 *  column range.
 *
 *  Root cause for cycle 7 finisher's 89-fallback/cycle finding: pickNextDestination
 *  applied `columnBounds = currentRealm.columnRange` to the pathfinder, but
 *  the AI was free to pick any landmark on the global map — including ones
 *  sitting in another realm's column band. The pathfinder then rejected
 *  every cell outside the current realm's range, the first attempt returned
 *  null, and the F4 fallback fired for the retry. C1 fix: drop those
 *  cross-realm non-exit targets *before* the AI ever sees them so the
 *  fallback is reserved for genuine stale-realm regressions.
 *
 *  Cycle-9 R2 follow-up: the original C1 rule allowed every `exit` landmark
 *  through unconditionally. mapLayout places one exit per realm transition
 *  on each side (`_FROM_to_TO_a` at `currentRealm.colEnd - 1`, `_TO_from_FROM_b`
 *  at `nextRealm.columnRange[0]`). With 5 transitions on the map that means
 *  10 exit landmarks share the candidate pool, and the cycle-8 postsim trace
 *  shows the AI repeatedly picking exits 2+ realms away (e.g. `hero (9,7)
 *  realm=base target (79,6)` = `_underworld_to_heaven_a`). Such a pick
 *  triggers the F4 fallback (hero starts in BLOCKED region under base's
 *  columnBounds) and on arrival fires `realm_entered base→sea` (one nextRealm
 *  step), leaving the scene's realm out of sync with the hero's actual
 *  column for the rest of the cycle (the Mode 1 cascade).
 *
 *  R2 rule for exit candidates:
 *    - exit must sit either *inside* `currentRealm.columnRange`
 *      (i.e. the `_a` side at `colEnd - 1`), OR
 *    - exit must sit at `nextRealm.columnRange[0]` (i.e. the `_b` side at
 *      the start of the immediately-adjacent next realm).
 *  Any exit at `nextRealm.columnRange[0] + 1` or further (= 2+ realm jump)
 *  is rejected. nextRealm doesn't need to be unlocked: the rule is purely
 *  geometric to keep filter behavior deterministic in tests; the controller
 *  already gates the actual realm flip on `unlockedRealms.includes(next)`.
 *
 *  Non-exit landmarks: must satisfy `colStart <= gridX < colEnd` of the
 *  current realm (unchanged from C1).
 *
 *  `currentRealm === undefined` short-circuits and returns the input
 *  unchanged (parity with the existing `columnBounds = undefined` branch
 *  in OverworldScene).
 */
export function filterCandidatesByRealm(
  candidates: readonly PlacedLandmark[],
  currentRealm: RealmId | undefined,
): PlacedLandmark[] {
  if (!currentRealm) return [...candidates];
  const realm = findRealm(currentRealm);
  const [colStart, colEnd] = realm.columnRange;
  const nextEntryCol = realm.nextRealm
    ? findRealm(realm.nextRealm).columnRange[0]
    : null;
  return candidates.filter(l => {
    if (l.type.kind === 'exit') {
      // exit on current-realm side: inside [colStart, colEnd)
      if (l.gridX >= colStart && l.gridX < colEnd) return true;
      // exit on adjacent-next-realm entry tile
      if (nextEntryCol !== null && l.gridX === nextEntryCol) return true;
      return false;
    }
    return l.gridX >= colStart && l.gridX < colEnd;
  });
}
