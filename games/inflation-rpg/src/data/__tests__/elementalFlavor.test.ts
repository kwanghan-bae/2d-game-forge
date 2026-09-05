import { describe, it, expect } from 'vitest';
import {
  getAffinityExclamation,
  getMonsterWeaknessHint,
  ELEMENTAL_EXCLAMATIONS,
  MONSTER_WEAKNESS_HINTS,
} from '../elementalFlavor';

describe('C1042: Elemental Flavor Exclamations & Monster Lore Tests', () => {
  it('returns distinct weakness exclamations across all 6 archetypes', () => {
    const archetypes = ['hwarang', 'mudang', 'choeui', 'geomgaek', 'tiger_hunter', 'uinyeo'];
    const exclamations = archetypes.map(id => getAffinityExclamation(id, 'weakness'));

    // All should be defined strings
    for (const exc of exclamations) {
      expect(typeof exc).toBe('string');
      expect(exc?.length).toBeGreaterThan(5);
    }

    // Warrior, mage, rogue, tank should have different lines
    expect(exclamations[0]).not.toBe(exclamations[1]);
    expect(exclamations[0]).not.toBe(exclamations[3]);
  });

  it('returns null for neutral affinity relation', () => {
    expect(getAffinityExclamation('hwarang', 'neutral')).toBeNull();
  });

  it('provides resistance and dark clash lines for warrior and mage', () => {
    const warriorResist = getAffinityExclamation('hwarang', 'resistance');
    const mageDarkClash = getAffinityExclamation('mudang', 'dark_clash');

    expect(warriorResist).toContain('역상성');
    expect(mageDarkClash).toContain('파동');
  });

  it('returns lore hints for major bosses and enemies', () => {
    expect(getMonsterWeaknessHint('fire_titan')).toContain('수(水)');
    expect(getMonsterWeaknessHint('dragon_lord')).toContain('맹화(火)');
    expect(getMonsterWeaknessHint('sea_serpent')).toContain('벼락(雷)');
    expect(getMonsterWeaknessHint('dark_lord')).toContain('심연');
  });

  it('returns null for enemies without dedicated lore hints', () => {
    expect(getMonsterWeaknessHint('unknown_slime')).toBeNull();
  });
});
