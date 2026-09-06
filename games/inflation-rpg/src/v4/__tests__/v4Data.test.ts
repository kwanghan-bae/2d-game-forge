import { describe, expect, it } from 'vitest';
import { AGENT_DEFINITIONS, FACILITY_DEFINITIONS, REALM_DEFINITIONS } from '../data';

describe('v4 launch data contract', () => {
  it('keeps the launch boundary at seven facilities, three agents, and three realms', () => {
    expect(Object.keys(FACILITY_DEFINITIONS)).toHaveLength(7);
    expect(Object.keys(AGENT_DEFINITIONS)).toEqual(['blacksmith', 'mudang', 'guide']);
    expect(Object.keys(REALM_DEFINITIONS)).toEqual(['joseon_plains', 'deep_forest', 'underworld']);
  });

  it('defines normal, elite, and boss encounters in the production target time bands', () => {
    for (const realm of Object.values(REALM_DEFINITIONS)) {
      expect(realm.encounters.map((encounter) => encounter.tier)).toEqual(['normal', 'elite', 'boss']);
      const normal = realm.encounters[0];
      const elite = realm.encounters[1];
      const boss = realm.encounters[2];
      expect(normal.durationSeconds).toBeGreaterThanOrEqual(8);
      expect(normal.durationSeconds).toBeLessThanOrEqual(15);
      expect(elite.durationSeconds).toBeGreaterThanOrEqual(20);
      expect(elite.durationSeconds).toBeLessThanOrEqual(40);
      expect(boss.durationSeconds).toBeGreaterThanOrEqual(45);
      expect(boss.durationSeconds).toBeLessThanOrEqual(90);
      expect(boss.recommendedPower).toBe(realm.recommendedPower);
      expect(boss.enemyHpMultiplier).toBeGreaterThan(elite.enemyHpMultiplier);
      expect(boss.enemyAtkMultiplier).toBeGreaterThan(elite.enemyAtkMultiplier);
    }
  });
});
