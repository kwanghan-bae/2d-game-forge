// games/inflation-rpg/src/test/buildSynergy.test.ts
import { describe, it, expect } from 'vitest';
import { getModifierById } from '../data/modifiers';
import { getUltById } from '../data/jobskills';

describe('build synergy — spec §8.5 5 컨셉', () => {
  it('1. 화랑 검술 폭딜 — 일섬 ULT + 크리데미지 + 광기', () => {
    expect(getUltById('hwarang_ult_ilseom')).toBeDefined();
    expect(getModifierById('mod_crit_damage')).toBeDefined();
    expect(getModifierById('mod_madness')).toBeDefined();
    // 광기 = on_hp_below trigger (HP 30% 이하)
    const madness = getModifierById('mod_madness');
    expect(madness?.triggerCondition?.kind).toBe('on_hp_below');
  });

  it('2. 화랑 화염 폭격 — 진명 ULT + 화염피해 + 마법공격', () => {
    expect(getUltById('hwarang_ult_jinmyung')).toBeDefined();
    expect(getModifierById('mod_fire_dmg')).toBeDefined();
    expect(getModifierById('mod_magic_atk')).toBeDefined();
    // 화염피해 = stat_mod, weapon/accessory slot
    const fire = getModifierById('mod_fire_dmg');
    expect(fire?.effectType).toBe('stat_mod');
    expect(fire?.validSlots).toContain('weapon');
  });

  it('3. 무당 저주 봉쇄 — debuff/cc modifier 다중 stack', () => {
    expect(getUltById('mudang_ult_younghonsohwan')).toBeDefined();  // 영혼소환 (광역 다단)
    expect(getModifierById('mod_poison')).toBeDefined();
    expect(getModifierById('mod_stun')).toBeDefined();
    expect(getModifierById('mod_weaken')).toBeDefined();
    expect(getModifierById('mod_slow')).toBeDefined();
    // 약화/둔화 = debuff effect
    expect(getModifierById('mod_weaken')?.effectType).toBe('debuff');
    expect(getModifierById('mod_slow')?.effectType).toBe('debuff');
  });

  it('4. 무당 즉사 — 신탁 ULT + 즉사 + 검은노래', () => {
    expect(getUltById('mudang_ult_sintak')).toBeDefined();  // 신탁 (LUC 비례 처형)
    expect(getModifierById('mod_instakill')).toBeDefined();
    expect(getModifierById('mod_black_song')).toBeDefined();
    // 즉사 = on_hp_below trigger (HP 10% 이하)
    const instakill = getModifierById('mod_instakill');
    expect(instakill?.triggerCondition?.kind).toBe('on_hp_below');
  });

  it('5. 초의 흡혈 탱커 — 불괴 ULT + 흡혈 + 가시 + 재생 + 방어막', () => {
    expect(getUltById('choeui_ult_bulgwae')).toBeDefined();  // 불괴 (DEF buff)
    expect(getModifierById('mod_lifesteal')).toBeDefined();
    expect(getModifierById('mod_thorns')).toBeDefined();
    expect(getModifierById('mod_regen')).toBeDefined();
    expect(getModifierById('mod_shield')).toBeDefined();
    // 흡혈 = on_hit trigger
    expect(getModifierById('mod_lifesteal')?.triggerCondition?.kind).toBe('on_hit');
    // 방어막 = shield effect
    expect(getModifierById('mod_shield')?.effectType).toBe('shield');
  });
});
