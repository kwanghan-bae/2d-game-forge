/**
 * C729: DestinationBadgeLogic test — all LandmarkKind mapped.
 */
import { describe, it, expect } from 'vitest';
import { getDestinationDisplay } from '../../components/DestinationBadgeLogic';
import type { LandmarkKind } from '../../data/landmarks';

const ALL_KINDS: LandmarkKind[] = [
  'village', 'enemy', 'boss', 'shrine', 'cave', 'market', 'ruin', 'exit',
  'rival', 'watchtower', 'treasure_cave', 'holy_ruin', 'crossroads',
  'sightseeing', 'trial',
];

describe('DestinationBadgeLogic', () => {
  it('returns non-empty icon and label for every LandmarkKind', () => {
    for (const kind of ALL_KINDS) {
      const result = getDestinationDisplay(kind);
      expect(result.icon.length).toBeGreaterThan(0);
      expect(result.label.length).toBeGreaterThan(0);
    }
  });

  it('boss returns crown icon', () => {
    expect(getDestinationDisplay('boss').icon).toBe('👑');
  });

  it('village returns Village label', () => {
    expect(getDestinationDisplay('village').label).toBe('Village');
  });

  it('trial returns Trial label', () => {
    expect(getDestinationDisplay('trial').label).toBe('Trial');
  });
});
