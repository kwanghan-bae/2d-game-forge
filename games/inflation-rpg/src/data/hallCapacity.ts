// Cycle 113 — Hall of Sagas capacity policy (top-N union dedup).
//
// 3-axis union maintaining 3 leaderboard slices then deduping by id:
//   - top 50 by maxLevel desc
//   - top 10 by ageEnd desc
//   - top 5 per cause × N causes (currently 5) = 25
// Worst-case union (0 overlap) = 85. Hard cap enforced.

import type { HallEntry, HallState } from './hallTypes';
import {
  HALL_TOP_MAX_LEVEL,
  HALL_TOP_AGE_END,
  HALL_TOP_PER_CAUSE,
  HALL_CAPACITY_HARD_LIMIT,
} from './hallTypes';
import type { DeathCause } from '../saga/SagaTypes';

function topNBy<T>(arr: readonly T[], n: number, score: (e: T) => number): T[] {
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, n);
}

/** Returns a new HallState with `entry` appended + 3-axis top-N union dedup. */
export function addHallEntry(state: HallState, entry: HallEntry): HallState {
  // Dedup by id — replace if existing.
  const filtered = state.entries.filter(e => e.id !== entry.id);
  const candidates = [...filtered, entry];

  const topByLevel = topNBy(candidates, HALL_TOP_MAX_LEVEL, e => e.maxLevel);
  const topByAge = topNBy(candidates, HALL_TOP_AGE_END, e => e.ageEnd);

  const causes = Array.from(new Set(candidates.map(e => e.cause))) as DeathCause[];
  const topPerCause = causes.flatMap(c =>
    topNBy(candidates.filter(e => e.cause === c), HALL_TOP_PER_CAUSE, e => e.maxLevel)
  );

  // Union by id.
  const unionMap = new Map<string, HallEntry>();
  for (const e of [...topByLevel, ...topByAge, ...topPerCause]) {
    unionMap.set(e.id, e);
  }
  const union = Array.from(unionMap.values());

  // Defensive hard cap.
  if (union.length > HALL_CAPACITY_HARD_LIMIT) {
    return {
      entries: topNBy(union, HALL_CAPACITY_HARD_LIMIT, e => e.maxLevel),
    };
  }
  return { entries: union };
}
