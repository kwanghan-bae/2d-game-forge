import { describe, it, expect } from 'vitest';
import { MAP_AREAS } from './maps';
import { BOSSES } from './bosses';
import { MONSTERS } from './monsters';
import { REGIONS } from './regions';
import { EQUIPMENT_CATALOG } from './equipment';

describe('maps integrity', () => {
  it('every MapArea.bossId is defined in BOSSES', () => {
    const bossIds = new Set(BOSSES.map(b => b.id));
    const undefinedRefs: string[] = [];
    for (const area of MAP_AREAS) {
      if (area.bossId && !bossIds.has(area.bossId)) {
        undefinedRefs.push(`${area.id} -> ${area.bossId}`);
      }
    }
    expect(undefinedRefs, `Areas reference undefined bosses: ${undefinedRefs.join(', ')}`).toEqual([]);
  });
});

describe('Layer 1 content integrity', () => {
  it('every region has at least one region-tagged monster', () => {
    const regionsMissing: string[] = [];
    for (const region of REGIONS) {
      const matched = MONSTERS.filter(m => m.regionTags.includes(region.id));
      if (matched.length === 0) regionsMissing.push(region.id);
    }
    expect(regionsMissing, `Regions without monsters: ${regionsMissing.join(', ')}`).toEqual([]);
  });

  it('every common-tagged monster has regionTags == ["*"]', () => {
    const commons = MONSTERS.filter(m => m.regionTags.includes('*'));
    expect(commons.length).toBeGreaterThanOrEqual(8);
    for (const m of commons) {
      expect(m.regionTags).toEqual(['*']);
    }
  });

  it('every normal boss area has a hard counterpart in the same area (when not hard-only)', () => {
    const missing: string[] = [];
    const normals = BOSSES.filter(b => !b.isHardMode);
    for (const n of normals) {
      const area = MAP_AREAS.find(a => a.id === n.areaId);
      // Skip if area is hard-only (no normal mode play, irrelevant)
      if (area?.isHardOnly) continue;
      const hard = BOSSES.find(b => b.isHardMode && b.areaId === n.areaId);
      if (!hard) missing.push(`${n.id} (area ${n.areaId})`);
    }
    expect(missing, `Normal bosses missing hard counterpart: ${missing.join(', ')}`).toEqual([]);
  });

  it('every Boss.guaranteedDrop references existing equipment', () => {
    const equipmentIds = new Set(EQUIPMENT_CATALOG.map(e => e.id));
    const broken: string[] = [];
    for (const boss of BOSSES) {
      if (boss.guaranteedDrop && !equipmentIds.has(boss.guaranteedDrop)) {
        broken.push(`${boss.id} -> ${boss.guaranteedDrop}`);
      }
    }
    expect(broken, `Bosses with broken guaranteedDrop: ${broken.join(', ')}`).toEqual([]);
  });

  it('content counts meet Layer 1 targets', () => {
    expect(MONSTERS.length).toBeGreaterThanOrEqual(50);
    expect(EQUIPMENT_CATALOG.length).toBeGreaterThanOrEqual(40);
    expect(BOSSES.length).toBeGreaterThanOrEqual(50);
  });
});

describe('Layer 2 dungeon structure', () => {
  it('every area has stageCount in [5, 10]', () => {
    for (const area of MAP_AREAS) {
      expect(area.stageCount, `${area.id} stageCount`).toBeGreaterThanOrEqual(5);
      expect(area.stageCount, `${area.id} stageCount`).toBeLessThanOrEqual(10);
    }
  });

  it('every area has stageMonsterCount > 0', () => {
    for (const area of MAP_AREAS) {
      expect(area.stageMonsterCount, `${area.id} stageMonsterCount`).toBeGreaterThan(0);
    }
  });

  it('finalStageIsBoss matches bossId presence', () => {
    for (const area of MAP_AREAS) {
      const expected = area.bossId !== undefined;
      expect(area.finalStageIsBoss, `${area.id}`).toBe(expected);
    }
  });
});
