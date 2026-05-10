// games/inflation-rpg/src/test/balance-milestones.test.ts
import { describe, it, expect } from 'vitest';
import { runSweep } from '../../tools/balance-sweep';

describe('balance milestones — spec Section 10.1 measuredFloor ≥ expectedFloor', () => {
  it('runSweep 모든 row ≥ expectedFloor + 절벽 0', () => {
    const rows = runSweep({ n: 10 });  // CI 비용 통제, spec §7.4
    for (const row of rows) {
      expect.soft(
        row.withinTolerance,
        `${row.hours}h@F${row.expectedFloor}: measuredFloor=${row.measuredFloor}`,
      ).toBe(true);
      expect.soft(
        row.cliffsDetected,
        `${row.hours}h cliffs`,
      ).toEqual([]);
    }
  }, 120_000);
});
