import { describe, it, expect } from 'vitest';
import { MAP_AREAS } from './maps';
import { BOSSES } from './bosses';

describe('Maps Data Integrity', () => {
  it('all boss areaId values in BOSSES resolve to a valid area in MAP_AREAS', () => {
    const areaIds = new Set(MAP_AREAS.map((a) => a.id));
    for (const boss of BOSSES) {
      expect(areaIds.has(boss.areaId), `boss '${boss.id}' has areaId '${boss.areaId}' not in MAP_AREAS`).toBe(true);
    }
  });
});
