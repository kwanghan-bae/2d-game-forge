// games/inflation-rpg/src/data/modifiers.test.ts
import { describe, it, expect } from 'vitest';
import { MODIFIERS, getModifierById } from './modifiers';
import type { ModifierCategory } from '../types';

describe('MODIFIERS catalogue', () => {
  it('contains exactly 34 modifiers (8+8+6+6+6)', () => {
    expect(MODIFIERS.length).toBe(34);
  });

  it('all ids unique', () => {
    const ids = new Set(MODIFIERS.map(m => m.id));
    expect(ids.size).toBe(MODIFIERS.length);
  });

  it.each<[ModifierCategory, number]>([
    ['attack', 8],
    ['status', 8],
    ['utility', 6],
    ['defense', 6],
    ['special', 6],
  ])('category %s has %i modifiers', (cat, n) => {
    expect(MODIFIERS.filter(m => m.category === cat).length).toBe(n);
  });

  it('all modifiers have positive baseValue', () => {
    for (const m of MODIFIERS) {
      expect(m.baseValue).toBeGreaterThan(0);
    }
  });

  it('all modifiers have at least one valid slot', () => {
    for (const m of MODIFIERS) {
      expect(m.validSlots.length).toBeGreaterThan(0);
    }
  });

  it('special modifiers have mythic-weighted rarity', () => {
    const specials = MODIFIERS.filter(m => m.category === 'special');
    for (const m of specials) {
      expect(m.rarityWeight.mythic).toBeGreaterThan(m.rarityWeight.common);
    }
  });

  it('trigger modifiers have triggerCondition', () => {
    const triggers = MODIFIERS.filter(m => m.effectType === 'trigger');
    for (const m of triggers) {
      expect(m.triggerCondition).toBeDefined();
    }
  });

  it('getModifierById works', () => {
    expect(getModifierById('mod_crit_damage')?.nameKR).toBe('크리데미지');
    expect(getModifierById('nonexistent')).toBeUndefined();
  });
});
