// Cycle 129 — N5 Live Ops mega-phase F2: seasonId deterministic 산출 test
//
// Test plan: docs/superpowers/evolution/cycle-127-test-plan.md §F2.1, F2.2, EDGE.1, EDGE.5

import { describe, expect, it } from 'vitest';
import {
  SEASON_EPOCH_0,
  SEASON_MS,
  seasonIdForTimestamp,
} from '../seasonId';

describe('Cycle 129 F2 — seasonIdForTimestamp deterministic', () => {
  /** F2.1 — boundary: epoch0 정확히, SEASON_MS - 1, SEASON_MS */
  it('F2.1 epoch0 boundary — 0/0/1', () => {
    expect(seasonIdForTimestamp(SEASON_EPOCH_0)).toBe(0);
    expect(seasonIdForTimestamp(SEASON_EPOCH_0 + SEASON_MS - 1)).toBe(0);
    expect(seasonIdForTimestamp(SEASON_EPOCH_0 + SEASON_MS)).toBe(1);
  });

  /** F2.1 (continued) — exact 30-day rotation */
  it('F2.1 30-day rotation — seasonId N = epoch0 + N*SEASON_MS', () => {
    for (const n of [1, 2, 5, 12, 30, 100]) {
      expect(seasonIdForTimestamp(SEASON_EPOCH_0 + n * SEASON_MS)).toBe(n);
    }
  });

  /** F2.2 — different timestamps → different seasonIds */
  it('F2.2 30 시즌 후 → seasonId 30', () => {
    expect(seasonIdForTimestamp(SEASON_EPOCH_0 + 30 * SEASON_MS)).toBe(30);
    expect(seasonIdForTimestamp(SEASON_EPOCH_0 + 30 * SEASON_MS + 1)).toBe(30);
    expect(seasonIdForTimestamp(SEASON_EPOCH_0 + 31 * SEASON_MS - 1)).toBe(30);
  });

  /** F2.1 (referential) — same input → same output (pure function) */
  it('F2.1 determinism — 같은 input 두 번 호출 → 같은 output', () => {
    const t = SEASON_EPOCH_0 + 7 * SEASON_MS + 123_456;
    expect(seasonIdForTimestamp(t)).toBe(seasonIdForTimestamp(t));
    expect(seasonIdForTimestamp(t)).toBe(7);
  });

  /** EDGE.5 — pre-epoch clock skew → clamp 0 (정책) */
  it('EDGE.5 pre-epoch (nowMs < epoch0) → 0 clamp', () => {
    expect(seasonIdForTimestamp(SEASON_EPOCH_0 - 1)).toBe(0);
    expect(seasonIdForTimestamp(SEASON_EPOCH_0 - SEASON_MS)).toBe(0);
    expect(seasonIdForTimestamp(0)).toBe(0);
  });

  /** epoch0 인자 override — 별도 epoch 으로 호출 가능 (test mock 친화). */
  it('epoch0 override — custom epoch 으로 deterministic', () => {
    const customEpoch = Date.UTC(2027, 5, 1);
    expect(seasonIdForTimestamp(customEpoch, customEpoch)).toBe(0);
    expect(seasonIdForTimestamp(customEpoch + 2 * SEASON_MS, customEpoch)).toBe(2);
  });
});
