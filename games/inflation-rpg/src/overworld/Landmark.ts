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

export function landmarkToCandidate(l: PlacedLandmark): { id: string; kind: LandmarkKind; difficulty: number } {
  // V1a: all enemies difficulty 1, bosses 3. Real difficulty in later phase.
  const difficulty = l.type.kind === 'boss' ? 3 : 1;
  return { id: l.instanceId, kind: l.type.kind, difficulty };
}

/** Cycle-8 C1: filter target candidates by hero's current realm column range.
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
 *  - `exit` landmarks always pass: they are the legitimate cross-realm
 *    transition path (mapLayout places one exit at `colEnd - 1` inside the
 *    current realm AND one at `nextRealm.columnRange[0]` outside it; either
 *    reaching position triggers `realm_entered`, but exit_b sits outside
 *    the bounds, so we keep both as valid candidates).
 *  - `currentRealm === undefined` short-circuits and returns the input
 *    unchanged (parity with the existing `columnBounds = undefined` branch
 *    in OverworldScene).
 *  - Non-exit landmarks must satisfy `colStart <= gridX < colEnd` of the
 *    current realm.
 */
export function filterCandidatesByRealm(
  candidates: readonly PlacedLandmark[],
  currentRealm: RealmId | undefined,
): PlacedLandmark[] {
  if (!currentRealm) return [...candidates];
  const [colStart, colEnd] = findRealm(currentRealm).columnRange;
  return candidates.filter(l => {
    if (l.type.kind === 'exit') return true;
    return l.gridX >= colStart && l.gridX < colEnd;
  });
}
