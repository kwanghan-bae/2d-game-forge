import { describe, it, expect } from 'vitest';
import { buildActiveSkillsForCombat } from './buildActiveSkills';

describe('buildActiveSkillsForCombat', () => {
  it('returns base skills for hwarang with no slot picks', () => {
    const skills = buildActiveSkillsForCombat('hwarang', { skillLevels: {}, ultSlotPicks: { hwarang: [null, null, null, null] } } as any);
    expect(skills.length).toBe(2);
    expect(skills[0]?.id).toBe('hwarang-strike');
  });

  it('includes slotted ULTs as additional active skills', () => {
    const skills = buildActiveSkillsForCombat('hwarang', {
      skillLevels: { hwarang: { 'hwarang_ult_ilseom': 0 } },
      ultSlotPicks: { hwarang: ['hwarang_ult_ilseom', null, null, null] },
    } as any);
    expect(skills.length).toBe(3);
    expect(skills.find(s => s.id === 'hwarang_ult_ilseom')).toBeTruthy();
  });

  it('applies skillCooldownMul to ULT cooldownSec', () => {
    const skills = buildActiveSkillsForCombat('hwarang', {
      skillLevels: { hwarang: { 'hwarang_ult_ilseom': 100 } },
      ultSlotPicks: { hwarang: ['hwarang_ult_ilseom', null, null, null] },
    } as any);
    const ult = skills.find(s => s.id === 'hwarang_ult_ilseom');
    expect(ult?.cooldownSec).toBeCloseTo(8 * 0.5, 5);
  });

  it('attaches dmgMul property based on lv', () => {
    const skills = buildActiveSkillsForCombat('hwarang', {
      skillLevels: { hwarang: { 'hwarang-strike': 50 } },
      ultSlotPicks: { hwarang: [null, null, null, null] },
    } as any);
    const base = skills.find(s => s.id === 'hwarang-strike');
    expect((base as any)?.dmgMul).toBeCloseTo(3.5, 5);
  });

  it('returns [] for unknown char', () => {
    expect(buildActiveSkillsForCombat('foo', { skillLevels: {}, ultSlotPicks: {} } as any)).toEqual([]);
  });
});
