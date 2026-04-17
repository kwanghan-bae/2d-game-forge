import { describe, it, expect } from 'vitest';
import { 
    SkillType, 
    Skill, 
    StatusEffect, 
    SKILL_CATALOG,
    getSkillById,
    getSkillsByClass
} from '../src/game/data/SkillData';

describe('SkillData', () => {
    describe('SKILL_CATALOG 구조', () => {
        it('최소 8개의 스킬을 포함해야 함 (기존 4개 + 직업 전용 4개)', () => {
            expect(SKILL_CATALOG.length).toBeGreaterThanOrEqual(8);
        });

        it('모든 스킬이 id를 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                expect(skill.id).toBeDefined();
                expect(typeof skill.id).toBe('number');
            });
        });

        it('모든 스킬이 name을 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                expect(skill.name).toBeDefined();
                expect(typeof skill.name).toBe('string');
            });
        });

        it('모든 스킬이 type을 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                expect(skill.type).toBeDefined();
                expect(Object.values(SkillType)).toContain(skill.type);
            });
        });

        it('모든 스킬이 power를 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                expect(skill.power).toBeDefined();
                expect(typeof skill.power).toBe('number');
            });
        });

        it('모든 스킬이 cooldown을 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                expect(skill.cooldown).toBeDefined();
                expect(typeof skill.cooldown).toBe('number');
            });
        });

        it('모든 스킬이 description을 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                expect(skill.description).toBeDefined();
                expect(typeof skill.description).toBe('string');
            });
        });

        it('모든 스킬이 atlasKey를 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                expect(skill.atlasKey).toBeDefined();
                expect(typeof skill.atlasKey).toBe('string');
            });
        });

        it('모든 스킬이 frame을 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                expect(skill.frame).toBeDefined();
                expect(typeof skill.frame).toBe('number');
            });
        });

        it('모든 스킬이 vfxFrame을 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                expect(skill.vfxFrame).toBeDefined();
                expect(typeof skill.vfxFrame).toBe('number');
            });
        });
    });

    describe('classRequirement 필드', () => {
        it('모든 스킬이 classRequirement 필드를 가져야 함 (undefined 또는 string)', () => {
            SKILL_CATALOG.forEach(skill => {
                // optional 필드이므로 undefined이거나 string이어야 함
                expect(skill.classRequirement === undefined || typeof skill.classRequirement === 'string').toBe(true);
            });
        });

        it('classRequirement는 string 또는 undefined여야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                if (skill.classRequirement !== undefined) {
                    expect(typeof skill.classRequirement).toBe('string');
                }
            });
        });

        it('유효한 직업명만 classRequirement로 사용되어야 함', () => {
            const validClasses = ['hwarang', 'tiger_hunter', 'mudang', 'choeui'];
            SKILL_CATALOG.forEach(skill => {
                if (skill.classRequirement !== undefined) {
                    expect(validClasses).toContain(skill.classRequirement);
                }
            });
        });

        it('ID 5~8 스킬은 classRequirement를 가져야 함', () => {
            const jobSpecificSkills = SKILL_CATALOG.filter(s => s.id >= 5 && s.id <= 8);
            expect(jobSpecificSkills.length).toBeGreaterThanOrEqual(4);
            jobSpecificSkills.forEach(skill => {
                expect(skill.classRequirement).toBeDefined();
                expect(skill.classRequirement).not.toBeNull();
            });
        });
    });

    describe('targetType 필드', () => {
        it('모든 스킬이 targetType 필드를 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                expect(skill).toHaveProperty('targetType');
            });
        });

        it('targetType은 단일 선택이어야 함', () => {
            const validTargetTypes = ['single', 'aoe', 'self'];
            SKILL_CATALOG.forEach(skill => {
                expect(validTargetTypes).toContain(skill.targetType);
            });
        });
    });

    describe('statusEffect 필드', () => {
        it('statusEffect는 optional이어야 함', () => {
            const skillsWithEffect = SKILL_CATALOG.filter(s => s.statusEffect !== undefined);
            const skillsWithoutEffect = SKILL_CATALOG.filter(s => s.statusEffect === undefined);
            
            expect(skillsWithEffect.length).toBeGreaterThan(0);
            expect(skillsWithoutEffect.length).toBeGreaterThan(0);
        });

        it('statusEffect가 있으면 유효한 type을 가져야 함', () => {
            const validStatusEffects = ['bleed', 'invincible', 'buff_attack', 'buff_defense'];
            SKILL_CATALOG.forEach(skill => {
                if (skill.statusEffect) {
                    expect(validStatusEffects).toContain(skill.statusEffect.type);
                }
            });
        });

        it('statusEffect가 있으면 duration을 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                if (skill.statusEffect) {
                    expect(skill.statusEffect.duration).toBeDefined();
                    expect(typeof skill.statusEffect.duration).toBe('number');
                    expect(skill.statusEffect.duration).toBeGreaterThan(0);
                }
            });
        });

        it('statusEffect가 있으면 power를 가져야 함', () => {
            SKILL_CATALOG.forEach(skill => {
                if (skill.statusEffect) {
                    expect(skill.statusEffect.power).toBeDefined();
                    expect(typeof skill.statusEffect.power).toBe('number');
                }
            });
        });

        it('상태이상 스킬 (ID 5, 6, 8)은 statusEffect를 가져야 함', () => {
            const bleedSkill = getSkillById(5); // 반월참
            const invincibleSkill = getSkillById(6); // 금강자세
            const buffSkill = getSkillById(8); // 장군 소환

            expect(bleedSkill?.statusEffect).toBeDefined();
            expect(invincibleSkill?.statusEffect).toBeDefined();
            expect(buffSkill?.statusEffect).toBeDefined();
        });

        it('헤드샷 (ID 7)은 statusEffect를 가지지 않아야 함', () => {
            const headshotSkill = getSkillById(7);
            expect(headshotSkill?.statusEffect).toBeUndefined();
        });
    });

    describe('직업 전용 스킬 검증', () => {
        it('화랑 전용: 반월참 (ID 5)이 존재해야 함', () => {
            const skill = getSkillById(5);
            expect(skill).toBeDefined();
            expect(skill?.name).toContain('반월참');
            expect(skill?.classRequirement).toBe('hwarang');
        });

        it('반월참은 출혈 상태이상을 가져야 함', () => {
            const skill = getSkillById(5);
            expect(skill?.statusEffect?.type).toBe('bleed');
            expect(skill?.statusEffect?.duration).toBe(3);
            expect(skill?.statusEffect?.power).toBe(0.10);
        });

        it('초의 전용: 금강자세 (ID 6)이 존재해야 함', () => {
            const skill = getSkillById(6);
            expect(skill).toBeDefined();
            expect(skill?.name).toContain('금강자세');
            expect(skill?.classRequirement).toBe('choeui');
        });

        it('금강자세는 무적 상태이상을 가져야 함', () => {
            const skill = getSkillById(6);
            expect(skill?.statusEffect?.type).toBe('invincible');
            expect(skill?.statusEffect?.duration).toBe(3);
        });

        it('착호갑사 전용: 헤드샷 (ID 7)이 존재해야 함', () => {
            const skill = getSkillById(7);
            expect(skill).toBeDefined();
            expect(skill?.name).toContain('헤드샷');
            expect(skill?.classRequirement).toBe('tiger_hunter');
        });

        it('헤드샷은 높은 데미지를 가져야 함', () => {
            const skill = getSkillById(7);
            expect(skill?.power).toBe(5.0);
            expect(skill?.targetType).toBe('single');
        });

        it('무당 전용: 장군 소환 (ID 8)이 존재해야 함', () => {
            const skill = getSkillById(8);
            expect(skill).toBeDefined();
            expect(skill?.name).toContain('장군');
            expect(skill?.classRequirement).toBe('mudang');
        });

        it('장군 소환은 버프 상태이상을 가져야 함', () => {
            const skill = getSkillById(8);
            expect(skill?.statusEffect).toBeDefined();
            const effectType = skill?.statusEffect?.type;
            expect(['buff_attack', 'buff_defense']).toContain(effectType);
        });
    });

    describe('getSkillById 헬퍼 함수', () => {
        it('존재하는 스킬 ID로 스킬을 반환해야 함', () => {
            const skill = getSkillById(1);
            expect(skill).toBeDefined();
            expect(skill?.id).toBe(1);
            expect(skill?.name).toContain('먹물');
        });

        it('존재하지 않는 스킬 ID로 undefined를 반환해야 함', () => {
            const skill = getSkillById(999);
            expect(skill).toBeUndefined();
        });

        it('모든 직업 전용 스킬(ID 5-8)을 찾을 수 있어야 함', () => {
            for (let i = 5; i <= 8; i++) {
                const skill = getSkillById(i);
                expect(skill).toBeDefined();
                expect(skill?.id).toBe(i);
            }
        });
    });

    describe('getSkillsByClass 헬퍼 함수', () => {
        it('특정 직업의 모든 스킬을 반환해야 함', () => {
            const hwarangSkills = getSkillsByClass('hwarang');
            expect(hwarangSkills.length).toBeGreaterThan(0);
            
            // 모든 반환된 스킬이 화랑이거나 공통 스킬이어야 함
            hwarangSkills.forEach(skill => {
                expect(
                    !skill.classRequirement || skill.classRequirement === 'hwarang'
                ).toBe(true);
            });
        });

        it('화랑은 반월참을 사용할 수 있어야 함', () => {
            const hwarangSkills = getSkillsByClass('hwarang');
            const hasMonSlash = hwarangSkills.some(s => s.id === 5);
            expect(hasMonSlash).toBe(true);
        });

        it('초의는 금강자세를 사용할 수 있어야 함', () => {
            const choeuiSkills = getSkillsByClass('choeui');
            const hasDiamondStance = choeuiSkills.some(s => s.id === 6);
            expect(hasDiamondStance).toBe(true);
        });

        it('착호갑사는 헤드샷을 사용할 수 있어야 함', () => {
            const tigerHunterSkills = getSkillsByClass('tiger_hunter');
            const hasHeadshot = tigerHunterSkills.some(s => s.id === 7);
            expect(hasHeadshot).toBe(true);
        });

        it('무당은 장군 소환을 사용할 수 있어야 함', () => {
            const mudangSkills = getSkillsByClass('mudang');
            const hasSummon = mudangSkills.some(s => s.id === 8);
            expect(hasSummon).toBe(true);
        });

        it('모든 직업이 공통 스킬(ID 1-4)을 사용할 수 있어야 함', () => {
            const classes = ['hwarang', 'tiger_hunter', 'mudang', 'choeui'];
            classes.forEach(className => {
                const skills = getSkillsByClass(className);
                for (let i = 1; i <= 4; i++) {
                    expect(skills.some(s => s.id === i)).toBe(true);
                }
            });
        });

        it('존재하지 않는 직업은 공통 스킬만 반환해야 함', () => {
            const unknownClassSkills = getSkillsByClass('unknown_class');
            unknownClassSkills.forEach(skill => {
                expect(skill.classRequirement).toBeUndefined();
            });
        });
    });

    describe('스킬 고유성 검증', () => {
        it('모든 스킬의 ID는 고유해야 함', () => {
            const ids = SKILL_CATALOG.map(s => s.id);
            const uniqueIds = new Set(ids);
            expect(uniqueIds.size).toBe(ids.length);
        });

        it('모든 스킬의 이름은 고유해야 함', () => {
            const names = SKILL_CATALOG.map(s => s.name);
            const uniqueNames = new Set(names);
            expect(uniqueNames.size).toBe(names.length);
        });
    });

    describe('기존 스킬 호환성', () => {
        it('먹물 베기 (ID 1)은 공통 스킬이어야 함', () => {
            const skill = getSkillById(1);
            expect(skill?.classRequirement).toBeUndefined();
        });

        it('부적 폭발 (ID 2)은 공통 스킬이어야 함', () => {
            const skill = getSkillById(2);
            expect(skill?.classRequirement).toBeUndefined();
        });

        it('치유의 연꽃 (ID 3)은 공통 스킬이어야 함', () => {
            const skill = getSkillById(3);
            expect(skill?.classRequirement).toBeUndefined();
        });

        it('호랑이의 기운 (ID 4)은 공통 스킬이어야 함', () => {
            const skill = getSkillById(4);
            expect(skill?.classRequirement).toBeUndefined();
        });
    });
});
