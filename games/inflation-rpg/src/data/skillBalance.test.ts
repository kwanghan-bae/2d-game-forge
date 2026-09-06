import { describe, it, expect } from 'vitest';
import { SKILLS } from './skills';

describe('Skill cooldown balance', () => {
  const allSkills = Object.values(SKILLS).flat();

  it('all cooldowns are between 3 and 25 seconds', () => {
    for (const s of allSkills) {
      expect(s.cooldownSec, `${s.nameKR} cooldown`).toBeGreaterThanOrEqual(3);
      expect(s.cooldownSec, `${s.nameKR} cooldown`).toBeLessThanOrEqual(25);
    }
  });

  it('execute skills have high cooldown (≥10s)', () => {
    const executes = allSkills.filter((s) => s.effect.type === 'execute');
    for (const s of executes) {
      expect(s.cooldownSec, `${s.nameKR} execute cooldown`).toBeGreaterThanOrEqual(10);
    }
  });

  it('heal skills have moderate cooldown (≥7s)', () => {
    const heals = allSkills.filter((s) => s.effect.type === 'heal');
    for (const s of heals) {
      expect(s.cooldownSec, `${s.nameKR} heal cooldown`).toBeGreaterThanOrEqual(7);
    }
  });

  it('buff duration never exceeds cooldown', () => {
    const buffs = allSkills.filter((s) => s.effect.type === 'buff');
    for (const s of buffs) {
      if ('buffDurationSec' in s.effect) {
        expect(
          (s.effect as { buffDurationSec: number }).buffDurationSec,
          `${s.nameKR} buff duration <= cooldown`
        ).toBeLessThanOrEqual(s.cooldownSec);
      }
    }
  });

  it('every character has exactly 2 skills', () => {
    for (const [charId, skills] of Object.entries(SKILLS)) {
      expect(skills, `${charId} skill count`).toHaveLength(2);
    }
  });
});
