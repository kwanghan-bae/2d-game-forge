import { describe, it, expect } from 'vitest';
import {
  ENEMY_TIER_MATRIX,
  ENEMY_ZONES,
  selectEnemyTypeId,
  zoneForColumn,
} from '../enemyTiers';
import { LANDMARK_TYPES } from '../landmarks';

describe('enemyTiers', () => {
  it('covers all 3 enemy zones × all 5 chapters', () => {
    for (const zone of ENEMY_ZONES) {
      const row = ENEMY_TIER_MATRIX[zone];
      expect(Object.keys(row).sort()).toEqual(['어린시절', '청년기', '장년기', '노년기', '마지막'].sort());
    }
  });

  it('every tier entry references a real LANDMARK_TYPES id of kind enemy', () => {
    for (const zone of ENEMY_ZONES) {
      for (const chapter of Object.keys(ENEMY_TIER_MATRIX[zone]) as Array<keyof typeof ENEMY_TIER_MATRIX[typeof zone]>) {
        const id = ENEMY_TIER_MATRIX[zone][chapter];
        const lm = LANDMARK_TYPES.find(t => t.id === id);
        expect(lm, `missing LANDMARK_TYPES entry for ${id}`).toBeTruthy();
        expect(lm!.kind).toBe('enemy');
      }
    }
  });

  it('selectEnemyTypeId returns the correct cell', () => {
    expect(selectEnemyTypeId('forest', '어린시절')).toBe('wolf');
    expect(selectEnemyTypeId('forest', '노년기')).toBe('nightmare_stalker');
    expect(selectEnemyTypeId('plains', '장년기')).toBe('warlord');
    expect(selectEnemyTypeId('mountains', '청년기')).toBe('ogre');
  });

  it('zoneForColumn matches mapLayout bands', () => {
    expect(zoneForColumn(0)).toBeNull();
    expect(zoneForColumn(3)).toBe('forest');
    expect(zoneForColumn(7)).toBe('forest');
    expect(zoneForColumn(8)).toBe('plains');
    expect(zoneForColumn(11)).toBe('plains');
    expect(zoneForColumn(12)).toBe('mountains');
    expect(zoneForColumn(16)).toBe('mountains');
    expect(zoneForColumn(17)).toBeNull(); // mystic zone — bosses only
  });
});
