// games/inflation-rpg/tools/balance-sweep.test.ts
import { describe, it, expect } from 'vitest';
import { runSweep, MILESTONES } from './balance-sweep';

describe('balance sweep harness', () => {
  it('runs all milestones without throwing', () => {
    const rows = runSweep({ n: 10 });
    expect(rows.length).toBe(MILESTONES.length);
    for (const row of rows) {
      expect(row.hours).toBeGreaterThan(0);
      expect(row.expectedFloor).toBeGreaterThan(0);
    }
  }, 60_000);
});
