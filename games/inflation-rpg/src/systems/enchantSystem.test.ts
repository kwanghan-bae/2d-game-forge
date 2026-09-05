import { describe, it, expect } from 'vitest';
import {
  ELEMENTAL_RUNES,
  ALL_RUNES,
  getRuneDef,
  canEnchantWithRune,
  applyRuneEnchant,
  getEffectiveElement,
  getEnchantDamageBonus,
  getEquippedEnchantBonus,
} from './enchantSystem';
import type { EquipmentInstance } from '../types';

describe('C1046: enchantSystem (Elemental Rune Enchanting)', () => {
  it('defines 4 core elemental runes with costs and benefits', () => {
    expect(ALL_RUNES).toHaveLength(4);
    for (const rune of ALL_RUNES) {
      const def = getRuneDef(rune);
      expect(def.nameKR).toBeDefined();
      expect(def.costGold).toBeGreaterThan(0);
      expect(def.costStones).toBeGreaterThan(0);
      expect(def.elementalBonusPercent).toBe(15);
    }
  });

  it('canEnchantWithRune checks gold and stones balance', () => {
    expect(canEnchantWithRune('rune_fire', 5000, 10)).toBe(true);
    expect(canEnchantWithRune('rune_fire', 4999, 10)).toBe(false);
    expect(canEnchantWithRune('rune_fire', 5000, 9)).toBe(false);
  });

  it('applyRuneEnchant attaches rune element to equipment instance', () => {
    const neutralKnife: EquipmentInstance = {
      instanceId: 'w1',
      baseId: 'w-knife', // neutral base
      enhanceLv: 3,
      modifiers: [],
    };

    const fireKnife = applyRuneEnchant(neutralKnife, 'rune_fire');
    expect(fireKnife.enchantElement).toBe('fire');
    expect(fireKnife.enhanceLv).toBe(3); // preserved
  });

  it('getEffectiveElement prioritizes enchanted rune over intrinsic base element', () => {
    // Blue dragon base is naturally fire
    const blueDragon: EquipmentInstance = {
      instanceId: 'w2',
      baseId: 'w-bluedragon',
      enhanceLv: 0,
      modifiers: [],
    };
    expect(getEffectiveElement(blueDragon)).toBe('fire');

    // Enchanting with lightning rune transforms effective element to lightning
    const lightningDragon = applyRuneEnchant(blueDragon, 'rune_lightning');
    expect(getEffectiveElement(lightningDragon)).toBe('lightning');

    // Untagged without enchant defaults to neutral
    const plainSword: EquipmentInstance = {
      instanceId: 'w3',
      baseId: 'w-sword',
      enhanceLv: 0,
      modifiers: [],
    };
    expect(getEffectiveElement(plainSword)).toBe('neutral');
  });

  it('computes enchant damage resonance bonus correctly for single and equipped sets', () => {
    const neutralWeapon: EquipmentInstance = {
      instanceId: 'w-plain',
      baseId: 'w-sword',
      enhanceLv: 0,
    };
    expect(getEnchantDamageBonus(neutralWeapon)).toBe(0);

    const fireWeapon = applyRuneEnchant(neutralWeapon, 'rune_fire');
    expect(getEnchantDamageBonus(fireWeapon)).toBe(0.15);

    const equipped: EquipmentInstance[] = [
      fireWeapon,
      neutralWeapon,
      applyRuneEnchant({ instanceId: 'a-1', baseId: 'a-plate', enhanceLv: 0 }, 'rune_water'),
    ];
    // Two enchanted items: 0.15 + 0.15 = 0.30
    expect(getEquippedEnchantBonus(equipped)).toBeCloseTo(0.30);
  });
});

