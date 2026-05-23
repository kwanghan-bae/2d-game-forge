import { describe, it, expect } from 'vitest';
import { generateMapLayout, GRID_W, GRID_H } from '../mapLayout';

describe('mapLayout — all landmarks inside grid bounds', () => {
  it('100 seeds: every placed landmark has 0 <= gridX < GRID_W and 0 <= gridY < GRID_H', () => {
    for (let seed = 0; seed < 100; seed++) {
      const layout = generateMapLayout(seed);
      for (const lm of layout.landmarks) {
        expect(lm.gridX, `seed ${seed} ${lm.instanceId}`).toBeGreaterThanOrEqual(0);
        expect(lm.gridX, `seed ${seed} ${lm.instanceId}`).toBeLessThan(GRID_W);
        expect(lm.gridY, `seed ${seed} ${lm.instanceId}`).toBeGreaterThanOrEqual(0);
        expect(lm.gridY, `seed ${seed} ${lm.instanceId}`).toBeLessThan(GRID_H);
      }
    }
  });
});
