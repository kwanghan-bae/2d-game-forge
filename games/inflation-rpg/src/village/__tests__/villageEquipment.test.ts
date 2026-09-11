import { describe, expect, it } from 'vitest';
import { completeFacilityTasks, startFacilityTask } from '../domain';
import { createInitialVillageSave, loadVillageSave, Village_SAVE_KEY } from '../save';
import { applyVillageEquipmentBonuses, getVillageEquipmentBonuses, getVillageEquipmentDefinition, getVillageEquipmentName } from '../equipment';

describe('Village equipment progression', () => {
  it('applies equipment bonuses to the eternal hero and upgrades repeated crafts', () => {
    const initial = createInitialVillageSave(101);
    const first = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const crafted = completeFacilityTasks(first.save, first.task.completesAt);
    expect(crafted.run.hero.equipmentIds).toEqual(['iron_sword']);
    expect(crafted.run.hero.equipmentLevels).toEqual({ iron_sword: 1 });
    expect(crafted.run.hero.atk).toBe(initial.run.hero.atk + 80);

    const second = startFacilityTask(crafted, 'blacksmith', crafted.updatedAt, 'blacksmith');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const upgraded = completeFacilityTasks(second.save, second.task.completesAt);

    expect(upgraded.run.hero.equipmentIds).toEqual(['iron_sword']);
    expect(upgraded.run.hero.equipmentLevels).toEqual({ iron_sword: 2 });
    expect(upgraded.run.hero.atk).toBe(initial.run.hero.atk + 160);
  });

  it('unlocks armor and talisman through higher-level blacksmith work', () => {
    const source = createInitialVillageSave(117);
    source.meta.facilities.blacksmith.level = 3;
    source.run.hero.equipmentIds = ['iron_sword'];
    source.run.hero.equipmentLevels = { iron_sword: 1 };

    const armorTask = startFacilityTask(source, 'blacksmith', source.updatedAt);
    expect(armorTask.ok).toBe(true);
    if (!armorTask.ok) return;
    expect(armorTask.task.outputEquipmentIds).toEqual(['guardian_armor']);
    expect(armorTask.task.type).toBe('수호 갑옷 제작');

    const armored = completeFacilityTasks(armorTask.save, armorTask.task.completesAt);
    const talismanTask = startFacilityTask(armored, 'blacksmith', armored.updatedAt);
    expect(talismanTask.ok).toBe(true);
    if (!talismanTask.ok) return;
    expect(talismanTask.task.outputEquipmentIds).toEqual(['spirit_talisman']);
    expect(talismanTask.task.type).toBe('영혼 부적 제작');

    const equipped = completeFacilityTasks(talismanTask.save, talismanTask.task.completesAt);
    expect(equipped.run.hero.equipmentIds).toEqual([
      'iron_sword',
      'guardian_armor',
      'spirit_talisman',
    ]);
  });

  it('rejects a saved hero without the current equipment level map', () => {
    const invalid = createInitialVillageSave(102);
    invalid.run.hero.equipmentIds = ['iron_sword'];
    const payload = JSON.parse(JSON.stringify(invalid)) as { run: { hero: Record<string, unknown> } };
    delete payload.run.hero.equipmentLevels;
    const storage = new Map<string, string>();
    const fakeStorage = { getItem: (key: string) => storage.get(key) ?? null } as unknown as Storage;
    storage.set(Village_SAVE_KEY, JSON.stringify(payload));

    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('rejects duplicate equipment records instead of normalizing them on load', () => {
    const invalid = createInitialVillageSave(104);
    invalid.run.hero.equipmentIds = ['iron_sword', 'iron_sword'];
    invalid.run.hero.equipmentLevels = { iron_sword: 2 };
    const storage = new Map<string, string>();
    const fakeStorage = { getItem: (key: string) => storage.get(key) ?? null } as unknown as Storage;
    storage.set(Village_SAVE_KEY, JSON.stringify(invalid));

    expect(loadVillageSave(fakeStorage)).toBeNull();
  });

  it('keeps equipment bonuses explicit and bounded by the saved level', () => {
    expect(getVillageEquipmentBonuses(['iron_sword'], { iron_sword: 3 })).toEqual({
      atk: 240,
      def: 0,
      hpMax: 0,
      critRate: 0,
    });
  });

  it('falls back to equipment level one for malformed runtime levels', () => {
    expect(getVillageEquipmentBonuses(['iron_sword'], {
      iron_sword: 'broken' as never,
    })).toEqual({ atk: 80, def: 0, hpMax: 0, critRate: 0 });
  });

  it('ignores non-finite equipment bonus fields', () => {
    const save = createInitialVillageSave(115);
    const before = { ...save.run.hero };

    applyVillageEquipmentBonuses(save.run.hero, {
      atk: Number.NaN,
      def: Number.POSITIVE_INFINITY,
      hpMax: 'broken' as never,
      critRate: Number.NaN,
    });

    expect(save.run.hero).toEqual(before);
  });

  it('normalizes malformed hero stats before applying equipment bonuses', () => {
    const save = createInitialVillageSave(116);
    const hero = save.run.hero;
    hero.atk = Number.NaN;
    hero.def = Number.POSITIVE_INFINITY;
    hero.defBase = Number.NaN;
    hero.hp = Number.POSITIVE_INFINITY;
    hero.hpMax = 0;
    hero.critRateBase = Number.NaN;

    applyVillageEquipmentBonuses(hero, { atk: 80, def: 60, hpMax: 150, critRate: 0.03 });

    expect(hero.atk).toBe(80);
    expect(hero.def).toBe(60);
    expect(hero.defBase).toBe(60);
    expect(hero.hpMax).toBe(150);
    expect(hero.hp).toBe(150);
    expect(hero.critRateBase).toBe(0.08);
  });

  it('does not increase hero stats after an equipment level reaches the cap', () => {
    const capped = createInitialVillageSave(103);
    capped.run.hero.equipmentIds = ['iron_sword'];
    capped.run.hero.equipmentLevels = { iron_sword: 20 };
    capped.run.hero.atk += 80 * 20;
    const started = startFacilityTask(capped, 'blacksmith', capped.updatedAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const crafted = completeFacilityTasks(started.save, started.task.completesAt);

    expect(crafted.run.hero.equipmentLevels).toEqual({ iron_sword: 20 });
    expect(crafted.run.hero.atk).toBe(capped.run.hero.atk);
  });

  it('does not leak an unknown equipment id into player-facing text', () => {
    expect(getVillageEquipmentName('unknown-equipment-id')).toBe('기록된 장비');
  });

  it('does not treat inherited object keys as equipment definitions', () => {
    expect(getVillageEquipmentDefinition('__proto__')).toBeUndefined();
    expect(getVillageEquipmentDefinition('constructor')).toBeUndefined();
    expect(getVillageEquipmentBonuses(['__proto__', 'constructor'])).toEqual({
      atk: 0,
      def: 0,
      hpMax: 0,
      critRate: 0,
    });
  });
});
