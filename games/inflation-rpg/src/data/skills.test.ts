import { describe, it, expect } from 'vitest';
import { CHARACTERS } from './characters';
import { SKILLS, getSkillsForCharacter, getAllSkills } from './skills';

describe('skills', () => {
  it('every character has exactly 2 active skills', () => {
    for (const char of CHARACTERS) {
      const skills = getSkillsForCharacter(char.id);
      expect(skills, `${char.id} skills`).not.toBeNull();
      expect(skills).toHaveLength(2);
    }
  });

  it('total active skill count is 32 (16 chars × 2)', () => {
    expect(getAllSkills()).toHaveLength(32);
  });

  it('all skill IDs are unique', () => {
    const allSkills = getAllSkills();
    const ids = allSkills.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every skill has cooldown > 0', () => {
    for (const s of getAllSkills()) {
      expect(s.cooldownSec, `${s.id}`).toBeGreaterThan(0);
    }
  });

  it('every skill has vfxEmoji', () => {
    for (const s of getAllSkills()) {
      expect(s.vfxEmoji.length, `${s.id}`).toBeGreaterThan(0);
    }
  });
});
