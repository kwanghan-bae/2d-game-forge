// Cycle 112 — Hall of Sagas (N3 sub-feature 1/3)
//
// 영구 hall (rank-based eviction). sagaHistory[100] (FIFO) 와 분리.
// HallEntry = flat metadata only — saga 본문 (chapters / events) 은 저장 안 함
// (cycleId reference 만). 저장 데이터 크기 ≤ 100KB cap 충족 보장.
//
// Capacity policy: dedup by id, 3 axis union top-N
//   - top 50 by maxLevel desc
//   - top 10 by ageEnd desc
//   - top 5 per cause × 5 causes = 25
// Worst-case union (0 overlap) = 85 entries. Hard limit 85.

import type { DeathCause } from '../saga/SagaTypes';

/** Hall of Sagas 의 영구 등록 entry — flat metadata only.
 *  saga 본문 lookup 이 필요하면 cycleId 로 sagaHistory[100] 에서 검색. */
export interface HallEntry {
  readonly id: string;              // unique. saga.cycleId 와 동일 (1:1 mapping)
  readonly cycleId: string;         // saga.cycleId reference (UI 가 본문 lookup 가능)
  readonly heroName: string;        // saga.hero.name snapshot
  readonly maxLevel: number;        // saga.finalLevel (or hero.finalLevel fallback)
  readonly ageEnd: number;          // saga.finalAge (or hero.finalAge fallback)
  readonly cause: DeathCause;       // saga.deathCause (or hero.cause fallback)
  readonly realm: string;           // saga.finalRealm (or '' fallback)
  readonly finishedAt: number;      // saga.finishedAt (or saga.endedAtMs fallback)
}

export interface HallState {
  readonly entries: readonly HallEntry[];
}

/** v25 migration default + INITIAL_META default. */
export const EMPTY_HALL: HallState = { entries: [] };

/** Hall capacity policy — top-N per axis, union deduped by id. */
export const HALL_TOP_MAX_LEVEL = 50;
export const HALL_TOP_AGE_END = 10;
export const HALL_TOP_PER_CAUSE = 5;

/** Worst case union size = 50 + 10 + 25 = 85 entries when 0 overlap.
 *  Typical overlap (high maxLevel ↔ high ageEnd ↔ natural death) reduces this
 *  to 40-60. Test asserts entries.length ≤ HALL_CAPACITY_HARD_LIMIT invariant. */
export const HALL_CAPACITY_HARD_LIMIT = 85;
