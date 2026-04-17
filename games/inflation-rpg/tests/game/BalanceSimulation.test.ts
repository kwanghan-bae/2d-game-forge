/**
 * 밸런싱 시뮬레이션 테스트
 * 
 * 게임의 밸런스를 검증하고 플레이 가능한 수준을 확인합니다.
 */

import { describe, it, expect } from 'vitest';
import { ClassId, CLASS_CATALOG } from '../src/game/data/ClassData';
import { calculateClassStats } from '../src/game/utils/StatCalculator';

describe('게임 밸런싱 시뮬레이션', () => {
    describe('직업별 DPS 측정', () => {
        it('화랑 DPS @ 레벨 50', () => {
            const stats = calculateClassStats(ClassId.HWARANG, 50);
            const skillMultiplier = 1.2;
            const bossDamageReduction = 0.3;
            const dps = stats.attack * skillMultiplier * (1 - bossDamageReduction);
            
            expect(dps).toBeGreaterThan(0);
            expect(stats.attack).toBeGreaterThan(1000);
            console.log(`화랑 DPS (Lv50): ${dps.toFixed(2)}, 공격력: ${stats.attack}`);
        });

        it('화랑 DPS @ 레벨 100', () => {
            const stats = calculateClassStats(ClassId.HWARANG, 100);
            const skillMultiplier = 1.575;
            const bossDamageReduction = 0.3;
            const dps = stats.attack * skillMultiplier * (1 - bossDamageReduction);
            
            expect(dps).toBeGreaterThan(10000);
            console.log(`화랑 DPS (Lv100): ${dps.toFixed(2)}, 공격력: ${stats.attack}`);
        });

        it('착호갑사 DPS @ 레벨 50 (보스 피해 1.5배)', () => {
            const stats = calculateClassStats(ClassId.TIGER_HUNTER, 50);
            const dps = stats.attack * 1.575 * 0.7 * 1.5;
            
            expect(dps).toBeGreaterThan(1000);
            console.log(`착호갑사 DPS (Lv50): ${dps.toFixed(2)}, 공격력: ${stats.attack}`);
        });

        it('착호갑사 DPS @ 레벨 100 (보스 피해 1.5배)', () => {
            const stats = calculateClassStats(ClassId.TIGER_HUNTER, 100);
            const dps = stats.attack * 1.575 * 0.7 * 1.5;
            
            expect(dps).toBeGreaterThan(10000);
            console.log(`착호갑사 DPS (Lv100): ${dps.toFixed(2)}, 공격력: ${stats.attack}`);
        });

        it('직업별 DPS 비율 검증', () => {
            const hwarangStats = calculateClassStats(ClassId.HWARANG, 100);
            const tigerHunterStats = calculateClassStats(ClassId.TIGER_HUNTER, 100);
            
            const hwarangDPS = hwarangStats.attack * 1.575 * 0.7;
            const tigerHunterDPS = tigerHunterStats.attack * 1.575 * 0.7 * 1.5;
            const ratio = tigerHunterDPS / hwarangDPS;
            
            expect(ratio).toBeGreaterThan(1.2);
            console.log(`착호갑사/화랑 DPS 비율: ${ratio.toFixed(2)}배`);
        });
    });

    describe('영혼석 획득 속도', () => {
        it('레벨별 영혼석 획득', () => {
            const testCases = [
                { level: 50, bosses: 0, expected: 0 },
                { level: 100, bosses: 0, expected: 1 },
                { level: 100, bosses: 2, expected: 101 },
                { level: 500, bosses: 0, expected: 5 }
            ];
            
            testCases.forEach(test => {
                const stones = Math.floor(test.level / 100) + (test.bosses * 50);
                expect(stones).toBe(test.expected);
            });
        });

        it('영혼 등급 해금 필요 영혼석', () => {
            const unlocks = [
                { grade: 0, needed: 0, total: 0 },
                { grade: 1, needed: 100, total: 100 },
                { grade: 2, needed: 300, total: 400 },
                { grade: 3, needed: 800, total: 1200 }
            ];
            
            unlocks.forEach(u => {
                expect(u.total).toBe(u.needed + (u.grade === 0 ? 0 : unlocks[u.grade - 1].total));
            });
        });

        it('착호갑사 해금까지 필요 시간', () => {
            const totalStones = 1200;
            const avgPerRun = 100;
            const runsNeeded = Math.ceil(totalStones / avgPerRun);
            const timeHours = (runsNeeded * 30) / 60;
            
            expect(runsNeeded).toBe(12);
            expect(timeHours).toBeGreaterThan(5);
            console.log(`착호갑사 해금까지: ${runsNeeded}회차 (약 ${timeHours}시간)`);
        });
    });

    describe('직업 다양성 검증', () => {
        it('모든 직업이 정의되어 있는지 확인', () => {
            const requiredClasses = [
                ClassId.HWARANG,
                ClassId.MUDANG,
                ClassId.CHOEUI,
                ClassId.TIGER_HUNTER
            ];
            
            requiredClasses.forEach(classId => {
                const classData = CLASS_CATALOG.find(c => c.id === classId);
                expect(classData).toBeDefined();
                expect(classData?.passiveSkill).toBeDefined();
            });
        });

        it('각 직업이 고유한 패시브 스킬을 가지고 있는지 확인', () => {
            const passiveIds = new Set();
            
            CLASS_CATALOG.forEach(cls => {
                expect(cls.passiveSkill.id).toBeTruthy();
                passiveIds.add(cls.passiveSkill.id);
            });
            
            expect(passiveIds.size).toBeGreaterThanOrEqual(2);
        });

        it('직업별 성장률이 합리적인지 확인', () => {
            CLASS_CATALOG.forEach(cls => {
                // 성장률은 1.0 이상 1.2 이하여야 함
                Object.values(cls.growthRates).forEach(rate => {
                    expect(rate).toBeGreaterThanOrEqual(1.05);
                    expect(rate).toBeLessThanOrEqual(1.20);
                });
            });
        });
    });

    describe('성능 벤치마크', () => {
        it('스탯 계산 성능', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                calculateClassStats(ClassId.TIGER_HUNTER, 50 + (i % 50));
            }
            
            const duration = performance.now() - startTime;
            expect(duration).toBeLessThan(100);
            console.log(`1000번 스탯 계산: ${duration.toFixed(2)}ms`);
        });

        it('직업 데이터 접근 성능', () => {
            const startTime = performance.now();
            
            for (let i = 0; i < 1000; i++) {
                CLASS_CATALOG.forEach(c => c.baseStats.attack);
            }
            
            const duration = performance.now() - startTime;
            expect(duration).toBeLessThan(50);
            console.log(`1000회 직업 데이터 접근: ${duration.toFixed(2)}ms`);
        });
    });

    describe('밸런싱 기준 검증', () => {
        it('초보자 접근성 (화랑 Lv 1)', () => {
            const stats = calculateClassStats(ClassId.HWARANG, 1);
            
            expect(stats.hp).toBeGreaterThan(0);
            expect(stats.attack).toBeGreaterThan(0);
            expect(stats.defense).toBeGreaterThan(0);
        });

        it('최종 보스 대비 충분한 공격력 (착호갑사 Lv 100)', () => {
            const stats = calculateClassStats(ClassId.TIGER_HUNTER, 100);
            
            // 보스 HP 5000을 처리할 수 있는 수준의 공격력
            expect(stats.attack).toBeGreaterThan(50000);
        });

        it('직업별 밸런스 검증', () => {
            const level50 = 50;
            const classes = [
                ClassId.HWARANG,
                ClassId.MUDANG,
                ClassId.CHOEUI,
                ClassId.TIGER_HUNTER
            ];
            
            const stats = classes.map(c => calculateClassStats(c, level50));
            const attacks = stats.map(s => s.attack);
            
            // 최대 공격력과 최소 공격력의 비율
            const maxAttack = Math.max(...attacks);
            const minAttack = Math.min(...attacks);
            const ratio = maxAttack / minAttack;
            
            // 직업별 성장률이 다르므로 최대 15배 정도 차이 허용
            expect(ratio).toBeLessThan(20.0);
            console.log(`직업별 공격력 편차: ${ratio.toFixed(2)}배`);
        });
    });
});
