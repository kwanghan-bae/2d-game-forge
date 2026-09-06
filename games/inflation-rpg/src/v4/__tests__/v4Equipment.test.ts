import { describe, expect, it } from 'vitest';
import { completeFacilityTasks, startFacilityTask } from '../domain';
import { createInitialV4Save, loadV4Save, persistV4Save } from '../save';
import { getV4EquipmentBonuses, getV4EquipmentName } from '../equipment';

describe('v4 equipment progression', () => {
  it('applies equipment bonuses to the eternal hero and upgrades repeated crafts', () => {
    const initial = createInitialV4Save(101);
    const first = startFacilityTask(initial, 'blacksmith', initial.createdAt, 'blacksmith');
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const crafted = completeFacilityTasks(first.save, first.task.completesAt);
    expect(crafted.run.hero.equipmentIds).toEqual(['v4_iron_sword']);
    expect(crafted.run.hero.equipmentLevels).toEqual({ v4_iron_sword: 1 });
    expect(crafted.run.hero.atk).toBe(initial.run.hero.atk + 80);

    const second = startFacilityTask(crafted, 'blacksmith', crafted.updatedAt, 'blacksmith');
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    const upgraded = completeFacilityTasks(second.save, second.task.completesAt);

    expect(upgraded.run.hero.equipmentIds).toEqual(['v4_iron_sword']);
    expect(upgraded.run.hero.equipmentLevels).toEqual({ v4_iron_sword: 2 });
    expect(upgraded.run.hero.atk).toBe(initial.run.hero.atk + 160);
  });

  it('hydrates equipment stats from a pre-upgrade V4 save exactly once', () => {
    const oldSave = createInitialV4Save(102);
    oldSave.run.hero.equipmentIds = ['v4_iron_sword'];
    delete oldSave.run.hero.equipmentLevels;
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    persistV4Save(oldSave, fakeStorage);
    const hydrated = loadV4Save(fakeStorage);
    expect(hydrated?.run.hero.equipmentLevels).toEqual({ v4_iron_sword: 1 });
    expect(hydrated?.run.hero.atk).toBe(oldSave.run.hero.atk + 80);

    if (!hydrated) return;
    persistV4Save(hydrated, fakeStorage);
    expect(loadV4Save(fakeStorage)?.run.hero.atk).toBe(oldSave.run.hero.atk + 80);
  });

  it('caps duplicate legacy equipment records while hydrating old saves', () => {
    const oldSave = createInitialV4Save(104);
    oldSave.run.hero.equipmentIds = Array.from({ length: 21 }, () => 'v4_iron_sword');
    delete oldSave.run.hero.equipmentLevels;
    const storage = new Map<string, string>();
    const fakeStorage = {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
    } as unknown as Storage;

    persistV4Save(oldSave, fakeStorage);
    const hydrated = loadV4Save(fakeStorage);
    expect(hydrated?.run.hero.equipmentIds).toEqual(['v4_iron_sword']);
    expect(hydrated?.run.hero.equipmentLevels).toEqual({ v4_iron_sword: 20 });

    if (!hydrated) return;
    persistV4Save(hydrated, fakeStorage);
    expect(loadV4Save(fakeStorage)).not.toBeNull();
  });

  it('keeps equipment bonuses explicit and bounded by the saved level', () => {
    expect(getV4EquipmentBonuses(['v4_iron_sword'], { v4_iron_sword: 3 })).toEqual({
      atk: 240,
      def: 0,
      hpMax: 0,
      critRate: 0,
    });
  });

  it('falls back to equipment level one for malformed runtime levels', () => {
    expect(getV4EquipmentBonuses(['v4_iron_sword'], {
      v4_iron_sword: 'broken' as never,
    })).toEqual({ atk: 80, def: 0, hpMax: 0, critRate: 0 });
  });

  it('does not increase hero stats after an equipment level reaches the cap', () => {
    const capped = createInitialV4Save(103);
    capped.run.hero.equipmentIds = ['v4_iron_sword'];
    capped.run.hero.equipmentLevels = { v4_iron_sword: 20 };
    capped.run.hero.atk += 80 * 20;
    const started = startFacilityTask(capped, 'blacksmith', capped.updatedAt, null);
    expect(started.ok).toBe(true);
    if (!started.ok) return;

    const crafted = completeFacilityTasks(started.save, started.task.completesAt);

    expect(crafted.run.hero.equipmentLevels).toEqual({ v4_iron_sword: 20 });
    expect(crafted.run.hero.atk).toBe(capped.run.hero.atk);
  });

  it('does not leak an unknown legacy equipment id into player-facing text', () => {
    expect(getV4EquipmentName('legacy-knife-id')).toBe('기록된 장비');
  });
});
