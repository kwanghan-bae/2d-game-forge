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

/** Returns a new HallState with `entry` appended + 3-axis top-N union dedup.
 *  Cycle 123 — favorited entries are preserved regardless of rank (eviction
 *  protection). */
export function addHallEntry(state: HallState, entry: HallEntry): HallState {
  // Dedup by id — replace if existing.
  const filtered = state.entries.filter(e => e.id !== entry.id);
  const candidates = [...filtered, entry];

  const favorited = candidates.filter(e => e.favorited === true);
  const topByLevel = topNBy(candidates, HALL_TOP_MAX_LEVEL, e => e.maxLevel);
  const topByAge = topNBy(candidates, HALL_TOP_AGE_END, e => e.ageEnd);

  const causes = Array.from(new Set(candidates.map(e => e.cause))) as DeathCause[];
  const topPerCause = causes.flatMap(c =>
    topNBy(candidates.filter(e => e.cause === c), HALL_TOP_PER_CAUSE, e => e.maxLevel)
  );

  // Union by id (favorited always included).
  const unionMap = new Map<string, HallEntry>();
  for (const e of [...favorited, ...topByLevel, ...topByAge, ...topPerCause]) {
    unionMap.set(e.id, e);
  }
  const union = Array.from(unionMap.values());

  // Defensive hard cap — favorited 는 절대 evict 안 함 (먼저 분리, top maxLevel 로 비교).
  if (union.length > HALL_CAPACITY_HARD_LIMIT) {
    const favoritedEntries = union.filter(e => e.favorited === true);
    const nonFavorited = union.filter(e => e.favorited !== true);
    const keepCount = Math.max(0, HALL_CAPACITY_HARD_LIMIT - favoritedEntries.length);
    return {
      entries: [...favoritedEntries, ...topNBy(nonFavorited, keepCount, e => e.maxLevel)],
    };
  }
  return { entries: union };
}

/** Cycle 123 — toggle favorited flag for entry with matching id. */
export function toggleHallFavorite(state: HallState, id: string): HallState {
  return {
    entries: state.entries.map(e =>
      e.id === id ? { ...e, favorited: !e.favorited } : e
    ),
  };
}
