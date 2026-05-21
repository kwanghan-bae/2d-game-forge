import { describe, it, expect } from 'vitest';
import { LANDMARK_TYPES, type LandmarkType } from '../landmarks';

describe('LANDMARK_TYPES', () => {
  it('exports at least 8 landmark types', () => {
    expect(LANDMARK_TYPES.length).toBeGreaterThanOrEqual(8);
  });

  it('each type has id + emoji + kind + nameKR', () => {
    for (const l of LANDMARK_TYPES) {
      expect(l.id.length).toBeGreaterThan(0);
      expect(l.emoji.length).toBeGreaterThan(0);
      expect(['enemy', 'boss', 'village', 'shrine', 'cave', 'market', 'ruin', 'exit', 'rival'])
        .toContain(l.kind);
      expect(l.nameKR.length).toBeGreaterThan(0);
    }
  });

  it('village + enemy + boss + exit kinds all present', () => {
    const kinds = new Set(LANDMARK_TYPES.map(l => l.kind));
    expect(kinds.has('village')).toBe(true);
    expect(kinds.has('enemy')).toBe(true);
    expect(kinds.has('boss')).toBe(true);
    expect(kinds.has('exit')).toBe(true);
  });
});
