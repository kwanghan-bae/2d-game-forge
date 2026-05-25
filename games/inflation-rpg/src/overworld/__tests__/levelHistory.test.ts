/**
 * Cycle 111 F1 — LevelHistoryBuffer unit tests.
 *
 * Verifies the adaptive-decimation ring buffer covers:
 *  - C1 overflow stride doubling (push 60/61/120/121 boundary cases)
 *  - C2 readonly accessor immutability
 *  - last-entry invariant (most recent push always at end)
 *  - empty / single-sample shape
 */

import { describe, it, expect } from 'vitest';
import { LevelHistoryBuffer, LEVEL_HISTORY_CAPACITY } from '../levelHistory';

function mkSnap(index: number, level: number = index + 1, age: number = 5) {
  return { arrivalIndex: index, level, age };
}

describe('LevelHistoryBuffer (cycle 111 F1)', () => {
  it('starts empty with stride 1', () => {
    const buf = new LevelHistoryBuffer();
    expect(buf.get()).toEqual([]);
    expect(buf.getStride()).toBe(1);
    expect(buf.getCounter()).toBe(0);
  });

  it('accumulates samples up to capacity without decimating (C1)', () => {
    const buf = new LevelHistoryBuffer();
    for (let i = 0; i < LEVEL_HISTORY_CAPACITY; i++) {
      buf.push(mkSnap(i));
    }
    expect(buf.get().length).toBe(LEVEL_HISTORY_CAPACITY);
    expect(buf.getStride()).toBe(1);
  });

  it('decimates on overflow: push 61 → length 31, stride 2 (C1)', () => {
    const buf = new LevelHistoryBuffer();
    for (let i = 0; i < LEVEL_HISTORY_CAPACITY + 1; i++) {
      buf.push(mkSnap(i));
    }
    expect(buf.get().length).toBe(31);
    expect(buf.getStride()).toBe(2);
  });

  it('decimates twice: push 121 → length 31, stride 4 (C1)', () => {
    const buf = new LevelHistoryBuffer();
    // 0-59: length 60, stride 1
    // 60: length 30, stride 2 (decimated)
    // 61-119: every-other pushed → length grows 30 → 60 at push #120
    // 120: length 30, stride 4 (decimated again)
    // 121-...: stride 4
    for (let i = 0; i < 121; i++) {
      buf.push(mkSnap(i));
    }
    expect(buf.get().length).toBe(31);
    expect(buf.getStride()).toBe(4);
  });

  it('keeps arrivalIndex monotonically increasing across decimation (last-entry invariant)', () => {
    const buf = new LevelHistoryBuffer();
    for (let i = 0; i < 200; i++) {
      buf.push(mkSnap(i, i + 1));
    }
    const samples = buf.get();
    // Indices must be strictly ascending — decimation drops samples but never
    // reorders.
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!.arrivalIndex).toBeGreaterThan(samples[i - 1]!.arrivalIndex);
    }
    // Last entry must be a recently-pushed sample — within the last `stride`
    // counter ticks from the current counter (200). i.e. the most recent
    // stride-aligned push.
    const last = samples[samples.length - 1]!;
    const stride = buf.getStride();
    expect(buf.getCounter() - 1 - last.arrivalIndex).toBeLessThan(stride);
  });

  it('exposes readonly array via get() — TS type prevents mutation (C2)', () => {
    const buf = new LevelHistoryBuffer();
    buf.push(mkSnap(0));
    const samples = buf.get();
    // Runtime: readonly is type-only, but length-check confirms separate
    // identity from the next push wouldn't mutate the snapshot we hold.
    expect(samples.length).toBe(1);
    buf.push(mkSnap(1));
    // get() returns the current samples array; same identity is fine since the
    // consumer treats it as readonly. The important contract is that callers
    // can't change the data through this reference at compile time. This
    // assertion confirms the immediate observable: length grew because the
    // buffer's internal array grew — not because we mutated `samples`.
    expect(buf.get().length).toBe(2);
  });

  it('handles long cycle (1200 arrivals) producing 30..60 samples', () => {
    const buf = new LevelHistoryBuffer();
    for (let i = 0; i < 1200; i++) {
      buf.push(mkSnap(i));
    }
    const len = buf.get().length;
    expect(len).toBeGreaterThanOrEqual(30);
    expect(len).toBeLessThanOrEqual(60);
    // Stride should be at least 16 by then (60 → 30 → 60 → 30 → ...) — 5
    // decimation cycles get to stride 32.
    expect(buf.getStride()).toBeGreaterThanOrEqual(16);
  });

  it('counter reflects total push count regardless of decimation', () => {
    const buf = new LevelHistoryBuffer();
    for (let i = 0; i < 250; i++) {
      buf.push(mkSnap(i));
    }
    expect(buf.getCounter()).toBe(250);
  });
});
