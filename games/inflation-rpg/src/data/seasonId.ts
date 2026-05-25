// Cycle 129 — N5 Live Ops mega-phase F2: deterministic seasonId 산출
//
// PRD: docs/superpowers/evolution/cycle-125-prd.md §F2 의 "동작" 직접 회수.
// Test plan: docs/superpowers/evolution/cycle-127-test-plan.md §F2.1, F2.2, EDGE.1, EDGE.5
//
// **server-less 정체성 (PRD §"컨셉 가드")**:
//   - server fetch / sync 0
//   - epoch0 = `Date.UTC(2026, 0, 1)` UTC ms 고정 (timezone 영향 없음)
//   - SEASON_MS = 30 days (deterministic)
//
// **mid-cycle clock change 면역 (advisor §4)**:
//   - cycle 시작 시점 snapshot 을 store 가 가짐 (`meta.seasonStartedAt`)
//   - 본 file 은 *순수* timestamp → seasonId 변환만 제공. mid-cycle 면역은
//     wiring layer 의 책임.

/** epoch0 = 2026-01-01 UTC 00:00:00.000 (live-ops 시즌의 zero point). */
export const SEASON_EPOCH_0 = Date.UTC(2026, 0, 1);

/** SEASON_MS = 30 days. PRD 명시. */
export const SEASON_MS = 30 * 24 * 60 * 60 * 1000;

/** Pure timestamp → seasonId 변환.
 *
 *  Policy (EDGE.5): nowMs < epoch0 (시계 과거) 의 경우 seasonId = 0 으로 clamp.
 *  PRD EDGE.5 가 미정의이므로 본 cycle 에서 *clamp 0 정책* 으로 결정. 음수 id
 *  는 catalog rotation 의 정의 외 영역 — 안전을 위해 0 으로 고정.
 *
 *  determinism: 같은 nowMs 입력 → 같은 출력. mock-friendly.
 */
export function seasonIdForTimestamp(nowMs: number, epoch0: number = SEASON_EPOCH_0): number {
  const delta = nowMs - epoch0;
  if (delta < 0) return 0;  // EDGE.5 clamp policy
  return Math.floor(delta / SEASON_MS);
}
