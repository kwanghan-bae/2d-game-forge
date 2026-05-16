import { describe, it, expect } from 'vitest';
import { buildActiveSkillsForCombat } from './buildActiveSkills';

const EMPTY_MYTHIC = { mythicEquipped: [null, null, null, null, null], mythicOwned: [] };

describe('buildActiveSkillsForCombat', () => {
  it('returns base skills for hwarang with no slot picks', () => {
    const skills = buildActiveSkillsForCombat('hwarang', { skillLevels: {}, ultSlotPicks: { hwarang: [null, null, null, null] }, ...EMPTY_MYTHIC } as any);
    expect(skills.length).toBe(2);
    expect(skills[0]?.id).toBe('hwarang-strike');
  });

  it('includes slotted ULTs as additional active skills', () => {
    const skills = buildActiveSkillsForCombat('hwarang', {
      skillLevels: { hwarang: { 'hwarang_ult_ilseom': 0 } },
      ultSlotPicks: { hwarang: ['hwarang_ult_ilseom', null, null, null] },
      ...EMPTY_MYTHIC,
    } as any);
    expect(skills.length).toBe(3);
    expect(skills.find(s => s.id === 'hwarang_ult_ilseom')).toBeTruthy();
  });

  it('applies skillCooldownMul to ULT cooldownSec', () => {
    const skills = buildActiveSkillsForCombat('hwarang', {
      skillLevels: { hwarang: { 'hwarang_ult_ilseom': 100 } },
      ultSlotPicks: { hwarang: ['hwarang_ult_ilseom', null, null, null] },
      ...EMPTY_MYTHIC,
    } as any);
    const ult = skills.find(s => s.id === 'hwarang_ult_ilseom');
    expect(ult?.cooldownSec).toBeCloseTo(8 * 0.5, 5);
  });

  it('attaches dmgMul property based on lv', () => {
    const skills = buildActiveSkillsForCombat('hwarang', {
      skillLevels: { hwarang: { 'hwarang-strike': 50 } },
      ultSlotPicks: { hwarang: [null, null, null, null] },
      ...EMPTY_MYTHIC,
    } as any);
    const base = skills.find(s => s.id === 'hwarang-strike');
    expect((base as any)?.dmgMul).toBeCloseTo(3.5, 5);
  });

  it('returns [] for unknown char', () => {
    expect(buildActiveSkillsForCombat('foo', { skillLevels: {}, ultSlotPicks: {}, ...EMPTY_MYTHIC } as any)).toEqual([]);
  });
});

describe('cooldown — mythic wrap (Phase E)', () => {
  it('applies time_hourglass -30% on ult cooldown', () => {
    const metaWith = {
      skillLevels: { hwarang: {} },
      ultSlotPicks: { hwarang: ['hwarang_ult_ilseom', null, null, null] as (string | null)[] },
      mythicEquipped: ['time_hourglass', null, null, null, null],
      mythicOwned: ['time_hourglass'],
    } as any;
    const metaWithout = {
      ...metaWith,
      mythicEquipped: [null, null, null, null, null],
    } as any;
    const without = buildActiveSkillsForCombat('hwarang', metaWithout);
    const withMythic = buildActiveSkillsForCombat('hwarang', metaWith);
    const ultWithout = without.find(s => s.id === 'hwarang_ult_ilseom');
    const ultWith = withMythic.find(s => s.id === 'hwarang_ult_ilseom');
    expect(ultWithout).toBeTruthy();
    expect(ultWith).toBeTruthy();
    expect(ultWith!.cooldownSec).toBeCloseTo(ultWithout!.cooldownSec * 0.7, 5);
  });

  it('applies time_hourglass -30% on base skill cooldown', () => {
    const metaWith = {
      skillLevels: {},
      ultSlotPicks: { hwarang: [null, null, null, null] as (string | null)[] },
      mythicEquipped: ['time_hourglass', null, null, null, null],
      mythicOwned: ['time_hourglass'],
    } as any;
    const metaWithout = { ...metaWith, mythicEquipped: [null, null, null, null, null] } as any;
    const without = buildActiveSkillsForCombat('hwarang', metaWithout);
    const withMythic = buildActiveSkillsForCombat('hwarang', metaWith);
    expect(withMythic[0]!.cooldownSec).toBeCloseTo(without[0]!.cooldownSec * 0.7, 5);
  });

  it('Phase Realms: swift_winds (target=base) does not apply to ult, only time_hourglass', () => {
    const meta = {
      skillLevels: { hwarang: {} },
      ultSlotPicks: { hwarang: ['hwarang_ult_ilseom', null, null, null] as (string | null)[] },
      mythicEquipped: ['time_hourglass', 'swift_winds', null, null, null],
      mythicOwned: ['time_hourglass', 'swift_winds'],
    } as any;
    const metaWithout = { ...meta, mythicEquipped: [null, null, null, null, null] } as any;
    const skills = buildActiveSkillsForCombat('hwarang', meta);
    const baseline = buildActiveSkillsForCombat('hwarang', metaWithout);
    const ult = skills.find(s => s.id === 'hwarang_ult_ilseom');
    const ultBaseline = baseline.find(s => s.id === 'hwarang_ult_ilseom');
    expect(ult).toBeTruthy();
    expect(ultBaseline).toBeTruthy();
    // swift_winds (target='base') does not apply to ult; only time_hourglass applies (-30%)
    expect(ult!.cooldownSec).toBeCloseTo(ultBaseline!.cooldownSec * 0.7, 5);
    // Sanity: floor of 0.4 means actual cd never drops below 0.4× the unwrapped value
    expect(ult!.cooldownSec).toBeGreaterThanOrEqual(0.4 * ultBaseline!.cooldownSec);
  });

  it('Phase Realms: swift_winds + time_hourglass stack on base skills only', () => {
    const meta = {
      skillLevels: {},
      ultSlotPicks: { hwarang: [null, null, null, null] as (string | null)[] },
      mythicEquipped: ['time_hourglass', 'swift_winds', null, null, null],
      mythicOwned: ['time_hourglass', 'swift_winds'],
    } as any;
    const metaWithout = { ...meta, mythicEquipped: [null, null, null, null, null] } as any;
    const skills = buildActiveSkillsForCombat('hwarang', meta);
    const baseline = buildActiveSkillsForCombat('hwarang', metaWithout);
    const base = skills[0]; // hwarang-strike
    const baseBaseline = baseline[0];
    expect(base).toBeTruthy();
    expect(baseBaseline).toBeTruthy();
    // Both apply to base: 0.7 × 0.8 = 0.56 (above 0.4 floor)
    expect(base!.cooldownSec).toBeCloseTo(baseBaseline!.cooldownSec * 0.56, 5);
  });

  it('no mythic equipped → no cooldown change', () => {
    const meta = {
      skillLevels: { hwarang: {} },
      ultSlotPicks: { hwarang: [null, null, null, null] as (string | null)[] },
      mythicEquipped: [null, null, null, null, null],
      mythicOwned: [],
    } as any;
    const skills = buildActiveSkillsForCombat('hwarang', meta);
    // hwarang-strike base cooldown is unchanged by mythic-less meta
    const base = skills.find(s => s.id === 'hwarang-strike');
    expect(base).toBeTruthy();
    // Cooldown unchanged means cd == baseCooldownSec × skillCooldownMul('base', 0) × 1.0
    // We just verify it matches the no-meta-call shape via the existing assertions style:
    const sameNoSlots = buildActiveSkillsForCombat('hwarang', { skillLevels: {}, ultSlotPicks: { hwarang: [null, null, null, null] }, ...EMPTY_MYTHIC } as any);
    const baseNoSlots = sameNoSlots.find(s => s.id === 'hwarang-strike');
    expect(base!.cooldownSec).toBeCloseTo(baseNoSlots!.cooldownSec, 5);
  });
});
