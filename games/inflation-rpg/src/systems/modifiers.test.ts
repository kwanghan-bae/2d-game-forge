// games/inflation-rpg/src/systems/modifiers.test.ts
import { describe, it, expect } from 'vitest';
import {
  rollModifiers, getModifierMagnitude, rerollCost, getSlotsCountForRarity,
  rerollOneSlot, rerollAllSlots,
} from './modifiers';
import type { EquipmentInstance, Modifier } from '../types';

const seededRng = (seed: number) => {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
};

const dummyMod: Modifier = {
  id: 'mod_crit_damage', nameKR: 'X', category: 'attack', baseValue: 0.5, effectType: 'stat_mod', validSlots: ['weapon'],
  rarityWeight: { common: 1, uncommon: 1, rare: 1, epic: 1, legendary: 1, mythic: 1 },
};

describe('getSlotsCountForRarity', () => {
  it('common→1, uncommon→1, rare→2, epic→2, legendary→3, mythic→4', () => {
    expect(getSlotsCountForRarity('common')).toBe(1);
    expect(getSlotsCountForRarity('uncommon')).toBe(1);
    expect(getSlotsCountForRarity('rare')).toBe(2);
    expect(getSlotsCountForRarity('epic')).toBe(2);
    expect(getSlotsCountForRarity('legendary')).toBe(3);
    expect(getSlotsCountForRarity('mythic')).toBe(4);
  });
});

describe('rollModifiers', () => {
  it('common weapon → 1 modifier', () => {
    const mods = rollModifiers('common', 'weapon', seededRng(1));
    expect(mods.length).toBe(1);
  });

  it('mythic weapon → 4 modifiers', () => {
    const mods = rollModifiers('mythic', 'weapon', seededRng(1));
    expect(mods.length).toBe(4);
  });

  it('mythic weapon roll 100 회 — special category 가 1 회 이상', () => {
    let specialCount = 0;
    for (let i = 0; i < 100; i++) {
      const mods = rollModifiers('mythic', 'weapon', seededRng(i + 1));
      specialCount += mods.filter(m => m.category === 'special').length;
    }
    expect(specialCount).toBeGreaterThan(0);
  });

  it('common rolls 50 회 — special 0 (mythic-only)', () => {
    for (let i = 0; i < 50; i++) {
      const mods = rollModifiers('common', 'weapon', seededRng(i + 1));
      expect(mods.filter(m => m.category === 'special').length).toBe(0);
    }
  });

  it('same seed → same modifiers (determinism)', () => {
    const m1 = rollModifiers('rare', 'weapon', seededRng(42));
    const m2 = rollModifiers('rare', 'weapon', seededRng(42));
    expect(m1.map(m => m.id)).toEqual(m2.map(m => m.id));
  });

  it('no duplicates within a single roll', () => {
    const mods = rollModifiers('mythic', 'weapon', seededRng(1));
    const ids = new Set(mods.map(m => m.id));
    expect(ids.size).toBe(mods.length);
  });
});

describe('getModifierMagnitude', () => {
  it('lv 0 returns base × 1.0', () => {
    const inst: EquipmentInstance = { instanceId: 'a', baseId: 'b', enhanceLv: 0, modifiers: [] };
    expect(getModifierMagnitude(dummyMod, inst, 'common')).toBeCloseTo(0.5, 5);
  });

  it('lv 100 common applies enhanceMultiplier (1 + 0.05*100 = 6)', () => {
    const inst: EquipmentInstance = { instanceId: 'a', baseId: 'b', enhanceLv: 100, modifiers: [] };
    expect(getModifierMagnitude(dummyMod, inst, 'common')).toBeCloseTo(0.5 * 6, 5);
  });
});

describe('getModifierMagnitude — modMagnitudeLv (Phase G mod_magnitude)', () => {
  const dummyMod2: Modifier = {
    id: 'm_test', nameKR: 'X', category: 'attack', baseValue: 0.5, effectType: 'stat_mod', validSlots: ['weapon'],
    rarityWeight: { common: 1, uncommon: 1, rare: 1, epic: 1, legendary: 1, mythic: 1 },
  };
  const inst2: EquipmentInstance = { instanceId: 'i_test', baseId: 'b_test', enhanceLv: 0, modifiers: [] };

  it('default modMagnitudeLv 0 = baseline (enhance lv 0)', () => {
    const baseline = getModifierMagnitude(dummyMod2, inst2, 'common');
    const explicit = getModifierMagnitude(dummyMod2, inst2, 'common', 0);
    expect(explicit).toBeCloseTo(baseline, 5);
  });

  it('modMagnitudeLv 10 = +50%', () => {
    const baseline = getModifierMagnitude(dummyMod2, inst2, 'common', 0);
    const boosted = getModifierMagnitude(dummyMod2, inst2, 'common', 10);
    expect(boosted).toBeCloseTo(baseline * 1.5, 5);
  });

  it('compose with enhance lv: enhance 1, magLv 5 = ×(enhance) × 1.25', () => {
    const inst1 = { ...inst2, enhanceLv: 1 };
    const baseline = getModifierMagnitude(dummyMod2, inst1, 'common', 0);
    const boosted = getModifierMagnitude(dummyMod2, inst1, 'common', 5);
    expect(boosted).toBeCloseTo(baseline * 1.25, 5);
  });
});

describe('rerollCost', () => {
  it('first reroll one slot: DR 25M, stones 250', () => {
    const c = rerollCost(0, 'one');
    expect(c.dr).toBe(25_000_000);
    expect(c.stones).toBe(250);
  });

  it('first reroll all: DR 100M, stones 1000', () => {
    const c = rerollCost(0, 'all');
    expect(c.dr).toBe(100_000_000);
    expect(c.stones).toBe(1000);
  });

  it('5th reroll multiplied by 1.5^5 ≈ 7.59', () => {
    const c = rerollCost(5, 'one');
    expect(c.dr).toBeCloseTo(25_000_000 * Math.pow(1.5, 5), -3);
  });
});

describe('rerollOneSlot / rerollAllSlots', () => {
  it('rerollOneSlot replaces only target slot', () => {
    const inst: EquipmentInstance = { instanceId: 'a', baseId: 'b', enhanceLv: 0, modifiers: [
      { ...dummyMod, id: 'old_a', nameKR: 'A' },
      { ...dummyMod, id: 'old_b', nameKR: 'B' },
    ]};
    const updated = rerollOneSlot(inst, 'rare', 'weapon', 0, seededRng(1));
    expect(updated.modifiers[1]?.id).toBe('old_b');
    expect(updated.modifiers[0]?.id).not.toBe('old_a');
  });

  it('rerollAllSlots replaces all slots', () => {
    const inst: EquipmentInstance = { instanceId: 'a', baseId: 'b', enhanceLv: 0, modifiers: [
      { ...dummyMod, id: 'old_a', nameKR: 'A' },
    ]};
    const updated = rerollAllSlots(inst, 'mythic', 'weapon', seededRng(1));
    expect(updated.modifiers.length).toBe(4);
  });
});
