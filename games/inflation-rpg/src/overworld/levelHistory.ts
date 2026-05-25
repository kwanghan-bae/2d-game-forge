/**
 * Cycle 111 F1 — LevelSnapshot ring buffer with adaptive decimation.
 *
 * Captures (arrivalIndex, level, age) tuples for every controller arrival.
 * On capacity reach, drops every-other entry + doubles stride so any cycle
 * length 1..N produces 30..60 stratified samples covering the *whole* cycle
 * (not just the endgame tail — naive FIFO 60 would zoom in on last 5% of
 * a 1200-arrival cycle, defeating the inflation curve visualization goal).
 *
 * advisor §A "adaptive decimation, not FIFO" — accepted.
 *
 * Used by:
 *  - CycleControllerV2 (push site at every handleArrival return path + 3
 *    resolve* methods)
 *  - InflationCurveChart (read-only via saga.levelHistory)
 *
 * NOT persisted — controller instance scope only. Saga attaches the buffer's
 * final snapshot on finalize() (cycle_end). cycleSliceV2 has no persist
 * middleware (verified during cycle 111 implementation grep), so R1 (persist
 * v24 maintained) is automatic.
 */

export interface LevelSnapshot {
  readonly arrivalIndex: number;
  readonly level: number;
  readonly age: number;
}

export const LEVEL_HISTORY_CAPACITY = 60;

export class LevelHistoryBuffer {
  private samples: LevelSnapshot[] = [];
  private stride: number = 1;
  private counter: number = 0;

  /** Push every call; decimate on capacity overflow. */
  push(snapshot: LevelSnapshot): void {
    this.counter += 1;
    if (this.counter % this.stride !== 0) return;
    this.samples.push(snapshot);
    if (this.samples.length > LEVEL_HISTORY_CAPACITY) {
      // Decimate: keep entries at even indices (0, 2, 4, ...) + double stride.
      // After this, samples.length is LEVEL_HISTORY_CAPACITY / 2 = 30.
      const decimated: LevelSnapshot[] = [];
      for (let i = 0; i < this.samples.length; i += 2) {
        decimated.push(this.samples[i]!);
      }
      this.samples = decimated;
      this.stride *= 2;
    }
  }

  /** Read-only accessor. Defensive readonly type; no runtime copy needed
   *  (TypeScript enforces). */
  get(): readonly LevelSnapshot[] {
    return this.samples;
  }

  /** Current decimation stride (1, 2, 4, 8, ...). Test/diagnostic only. */
  getStride(): number {
    return this.stride;
  }

  /** Total push count regardless of decimation. */
  getCounter(): number {
    return this.counter;
  }
}
