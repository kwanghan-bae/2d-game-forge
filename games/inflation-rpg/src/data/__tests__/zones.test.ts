import { describe, it, expect } from 'vitest';
import { ZONES, type ZoneId } from '../zones';

describe('ZONES', () => {
  it('exports exactly 5 zones', () => {
    expect(ZONES.length).toBe(5);
  });

  it('zone ids are unique', () => {
    const ids = new Set(ZONES.map(z => z.id));
    expect(ids.size).toBe(ZONES.length);
  });

  it('each zone has nameKR + biome + color + difficulty', () => {
    for (const z of ZONES) {
      expect(z.nameKR.length).toBeGreaterThan(0);
      expect(z.biome).toBeTruthy();
      expect(z.bgColor).toMatch(/^#[0-9a-f]{6}$/i);
      expect(z.difficulty).toBeGreaterThanOrEqual(1);
    }
  });

  it('village zone exists with difficulty 1', () => {
    const village = ZONES.find(z => z.id === 'village');
    expect(village).toBeDefined();
    expect(village!.difficulty).toBe(1);
  });
});
