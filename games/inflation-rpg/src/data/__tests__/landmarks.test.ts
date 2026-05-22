import { describe, it, expect } from 'vitest';
import { LANDMARK_TYPES } from '../landmarks';

describe('LANDMARK_TYPES', () => {
  it('exports at least 8 landmark types', () => {
    expect(LANDMARK_TYPES.length).toBeGreaterThanOrEqual(8);
  });

  it('each type has id + emoji + kind + nameKR', () => {
    const ALL_KINDS = [
      'enemy', 'boss', 'village', 'shrine', 'cave', 'market', 'ruin', 'exit', 'rival',
      'watchtower', 'treasure_cave', 'holy_ruin', 'crossroads',
    ];
    for (const l of LANDMARK_TYPES) {
      expect(l.id.length).toBeGreaterThan(0);
      expect(l.emoji.length).toBeGreaterThan(0);
      expect(ALL_KINDS).toContain(l.kind);
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

  // V1c-1: 새 personality drift 랜드마크 4개
  it('V1c-1: watchtower entry exists with correct kind', () => {
    const entry = LANDMARK_TYPES.find(l => l.id === 'watchtower');
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('watchtower');
    expect(entry!.nameKR.length).toBeGreaterThan(0);
    expect(entry!.emoji.length).toBeGreaterThan(0);
  });

  it('V1c-1: treasure_cave entry exists with correct kind', () => {
    const entry = LANDMARK_TYPES.find(l => l.id === 'treasure_cave');
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('treasure_cave');
    expect(entry!.nameKR.length).toBeGreaterThan(0);
    expect(entry!.emoji.length).toBeGreaterThan(0);
  });

  it('V1c-1: holy_ruin entry exists with correct kind', () => {
    const entry = LANDMARK_TYPES.find(l => l.id === 'holy_ruin');
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('holy_ruin');
    expect(entry!.nameKR.length).toBeGreaterThan(0);
    expect(entry!.emoji.length).toBeGreaterThan(0);
  });

  it('V1c-1: crossroads entry exists with correct kind', () => {
    const entry = LANDMARK_TYPES.find(l => l.id === 'crossroads');
    expect(entry).toBeDefined();
    expect(entry!.kind).toBe('crossroads');
    expect(entry!.nameKR.length).toBeGreaterThan(0);
    expect(entry!.emoji.length).toBeGreaterThan(0);
  });
});
