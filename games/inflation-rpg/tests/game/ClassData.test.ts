import { describe, it, expect } from 'vitest';
import { CLASS_CATALOG, ClassId, getClassById, getClassByRequirement } from '../src/game/data/ClassData';

describe('ClassData', () => {
    describe('CLASS_CATALOG Structure', () => {
        it('CLASS_CATALOG contains exactly 4 classes', () => {
            expect(CLASS_CATALOG).toHaveLength(4);
        });

        it('All classes have required fields', () => {
            CLASS_CATALOG.forEach(cls => {
                expect(cls.id).toBeDefined();
                expect(cls.nameKR).toBeDefined();
                expect(cls.nameEN).toBeDefined();
                expect(cls.description).toBeDefined();
                expect(cls.requiredSoulGrade).toBeDefined();
                expect(cls.baseStats).toBeDefined();
                expect(cls.growthRates).toBeDefined();
                expect(cls.passiveSkill).toBeDefined();
                expect(cls.startingSkills).toBeDefined();
            });
        });

        it('All classes have valid baseStats (> 0)', () => {
            CLASS_CATALOG.forEach(cls => {
                expect(cls.baseStats.hp).toBeGreaterThan(0);
                expect(cls.baseStats.attack).toBeGreaterThan(0);
                expect(cls.baseStats.defense).toBeGreaterThan(0);
                expect(cls.baseStats.agi).toBeGreaterThan(0);
                expect(cls.baseStats.luk).toBeGreaterThan(0);
            });
        });

        it('All classes have valid growthRates (> 1.0)', () => {
            CLASS_CATALOG.forEach(cls => {
                expect(cls.growthRates.hp).toBeGreaterThan(1.0);
                expect(cls.growthRates.attack).toBeGreaterThan(1.0);
                expect(cls.growthRates.defense).toBeGreaterThan(1.0);
                expect(cls.growthRates.agi).toBeGreaterThan(1.0);
                expect(cls.growthRates.luk).toBeGreaterThan(1.0);
            });
        });

        it('All classes have at least 1 starting skill', () => {
            CLASS_CATALOG.forEach(cls => {
                expect(cls.startingSkills.length).toBeGreaterThanOrEqual(1);
            });
        });

        it('All passive skills have required fields', () => {
            CLASS_CATALOG.forEach(cls => {
                const skill = cls.passiveSkill;
                expect(skill.id).toBeDefined();
                expect(skill.nameKR).toBeDefined();
                expect(skill.description).toBeDefined();
                expect(skill.effect).toBeDefined();
                expect(skill.value).toBeDefined();
                expect(skill.value).toBeGreaterThan(0);
            });
        });

        it('All passive skill effects are valid', () => {
            const validEffects = ['stat_boost', 'beast_damage', 'item_find', 'life_conversion'];
            CLASS_CATALOG.forEach(cls => {
                expect(validEffects).toContain(cls.passiveSkill.effect);
            });
        });
    });

    describe('Class Requirements Ordering', () => {
        it('requiredSoulGrade values are correctly ordered', () => {
            const grades = CLASS_CATALOG.map(cls => cls.requiredSoulGrade).sort((a, b) => a - b);
            expect(grades).toEqual([0, 3, 4, 5]);
        });

        it('Hwarang (화랑) has requiredSoulGrade 0', () => {
            const hwarang = CLASS_CATALOG.find(cls => cls.id === ClassId.HWARANG);
            expect(hwarang).toBeDefined();
            expect(hwarang?.requiredSoulGrade).toBe(0);
        });

        it('Tiger Hunter (착호갑사) has requiredSoulGrade 3', () => {
            const tigerHunter = CLASS_CATALOG.find(cls => cls.id === ClassId.TIGER_HUNTER);
            expect(tigerHunter).toBeDefined();
            expect(tigerHunter?.requiredSoulGrade).toBe(3);
        });

        it('Mudang (무당) has requiredSoulGrade 4', () => {
            const mudang = CLASS_CATALOG.find(cls => cls.id === ClassId.MUDANG);
            expect(mudang).toBeDefined();
            expect(mudang?.requiredSoulGrade).toBe(4);
        });

        it('Choeui (초의) has requiredSoulGrade 5', () => {
            const choeui = CLASS_CATALOG.find(cls => cls.id === ClassId.CHOEUI);
            expect(choeui).toBeDefined();
            expect(choeui?.requiredSoulGrade).toBe(5);
        });
    });

    describe('Individual Class Validation', () => {
        it('Hwarang has high AGI growth rate (1.12)', () => {
            const hwarang = CLASS_CATALOG.find(cls => cls.id === ClassId.HWARANG);
            expect(hwarang?.growthRates.agi).toBe(1.12);
        });

        it('Hwarang passive is stat_boost with value 1.10', () => {
            const hwarang = CLASS_CATALOG.find(cls => cls.id === ClassId.HWARANG);
            expect(hwarang?.passiveSkill.effect).toBe('stat_boost');
            expect(hwarang?.passiveSkill.value).toBe(1.10);
        });

        it('Tiger Hunter has high ATK growth rate (1.15)', () => {
            const tigerHunter = CLASS_CATALOG.find(cls => cls.id === ClassId.TIGER_HUNTER);
            expect(tigerHunter?.growthRates.attack).toBe(1.15);
        });

        it('Tiger Hunter passive is beast_damage with value 1.50', () => {
            const tigerHunter = CLASS_CATALOG.find(cls => cls.id === ClassId.TIGER_HUNTER);
            expect(tigerHunter?.passiveSkill.effect).toBe('beast_damage');
            expect(tigerHunter?.passiveSkill.value).toBe(1.50);
        });

        it('Mudang has high LUK growth rate (1.15)', () => {
            const mudang = CLASS_CATALOG.find(cls => cls.id === ClassId.MUDANG);
            expect(mudang?.growthRates.luk).toBe(1.15);
        });

        it('Mudang passive is item_find with value 1.20', () => {
            const mudang = CLASS_CATALOG.find(cls => cls.id === ClassId.MUDANG);
            expect(mudang?.passiveSkill.effect).toBe('item_find');
            expect(mudang?.passiveSkill.value).toBe(1.20);
        });

        it('Choeui has high HP and DEF growth rates', () => {
            const choeui = CLASS_CATALOG.find(cls => cls.id === ClassId.CHOEUI);
            expect(choeui?.growthRates.hp).toBe(1.12);
            expect(choeui?.growthRates.defense).toBe(1.10);
        });

        it('Choeui passive is life_conversion with value 0.05', () => {
            const choeui = CLASS_CATALOG.find(cls => cls.id === ClassId.CHOEUI);
            expect(choeui?.passiveSkill.effect).toBe('life_conversion');
            expect(choeui?.passiveSkill.value).toBe(0.05);
        });
    });

    describe('Helper Functions', () => {
        describe('getClassById', () => {
            it('returns class when ID exists', () => {
                const hwarang = getClassById(ClassId.HWARANG);
                expect(hwarang).toBeDefined();
                expect(hwarang?.id).toBe(ClassId.HWARANG);
                expect(hwarang?.nameKR).toBe('화랑');
            });

            it('returns undefined when ID does not exist', () => {
                const result = getClassById('invalid' as ClassId);
                expect(result).toBeUndefined();
            });

            it('returns correct class for all ClassId enums', () => {
                const ids = [ClassId.HWARANG, ClassId.TIGER_HUNTER, ClassId.MUDANG, ClassId.CHOEUI];
                ids.forEach(id => {
                    const cls = getClassById(id);
                    expect(cls).toBeDefined();
                    expect(cls?.id).toBe(id);
                });
            });
        });

        describe('getClassByRequirement', () => {
            it('returns classes available at soul grade 0', () => {
                const classes = getClassByRequirement(0);
                expect(classes).toHaveLength(1);
                expect(classes[0].id).toBe(ClassId.HWARANG);
            });

            it('returns classes available at soul grade 3', () => {
                const classes = getClassByRequirement(3);
                expect(classes.length).toBeGreaterThanOrEqual(2);
                const ids = classes.map(c => c.id);
                expect(ids).toContain(ClassId.HWARANG);
                expect(ids).toContain(ClassId.TIGER_HUNTER);
            });

            it('returns classes available at soul grade 4', () => {
                const classes = getClassByRequirement(4);
                expect(classes.length).toBeGreaterThanOrEqual(3);
                const ids = classes.map(c => c.id);
                expect(ids).toContain(ClassId.HWARANG);
                expect(ids).toContain(ClassId.TIGER_HUNTER);
                expect(ids).toContain(ClassId.MUDANG);
            });

            it('returns all classes at soul grade 5', () => {
                const classes = getClassByRequirement(5);
                expect(classes).toHaveLength(4);
            });

            it('returns all classes at soul grade higher than 5', () => {
                const classes = getClassByRequirement(10);
                expect(classes).toHaveLength(4);
            });

            it('returns empty array for negative soul grade', () => {
                const classes = getClassByRequirement(-1);
                expect(classes).toHaveLength(0);
            });

            it('results are sorted by requiredSoulGrade', () => {
                const classes = getClassByRequirement(5);
                const grades = classes.map(c => c.requiredSoulGrade);
                const sortedGrades = [...grades].sort((a, b) => a - b);
                expect(grades).toEqual(sortedGrades);
            });
        });
    });

    describe('Starting Skills Validation', () => {
        it('All classes start with skill ID 1 (먹물 베기)', () => {
            CLASS_CATALOG.forEach(cls => {
                expect(cls.startingSkills).toContain(1);
            });
        });
    });
});
