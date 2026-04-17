import { describe, it, expect } from 'vitest';
import { getScaledMonsterStats } from '../../src/game/data/Monsters';
import BigNumber from 'bignumber.js';

describe('Monster Scaling', () => {
    describe('Zone Level 1 (기본값)', () => {
        it('baseHP 100 → Zone 1에서 105 (1.05^1)', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, 1);
            
            expect(scaled.hp).toBeCloseTo(105, 0);
            expect(scaled.atk).toBeCloseTo(10, 0);
            expect(scaled.def).toBeCloseTo(5, 0);
        });

        it('baseHP 1000, baseATK 100 → Zone 1에서 기본 스탯', () => {
            const scaled = getScaledMonsterStats(1000, 100, 10, 1);
            
            expect(scaled.hp).toBeCloseTo(1050, 0);
            expect(scaled.atk).toBeCloseTo(105, 0);
            expect(scaled.def).toBeCloseTo(10, 0);
        });
    });

    describe('Zone Level 10', () => {
        it('baseHP 100 → 162 (100 * 1.05^10)', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, 10);
            
            const expectedHp = Math.floor(100 * Math.pow(1.05, 10));
            expect(scaled.hp).toBeCloseTo(expectedHp, 0);
        });
    });

    describe('Zone Level 100 (고성장 시작)', () => {
        it('baseHP 100 → 13,150 (100 * 1.05^100)', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, 100);
            
            const expected = Math.floor(100 * Math.pow(1.05, 100));
            expect(scaled.hp).toBeCloseTo(expected, -1);
        });

        it('baseATK 10 → 1,315 (10 * 1.05^100)', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, 100);
            
            const expected = Math.floor(10 * Math.pow(1.05, 100));
            expect(scaled.atk).toBeCloseTo(expected, -1);
        });
    });

    describe('Zone Level 101+ (성장률 1.08)', () => {
        it('Zone 101: baseHP 100 → 성장률 1.08 적용', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, 101);
            
            const expected = Math.floor(100 * Math.pow(1.08, 101));
            expect(scaled.hp).toBeCloseTo(expected, -2);
        });
    });

    describe('Zone Level 500+', () => {
        it('Zone 500: baseHP > 100,000 (고성장)', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, 500);
            
            expect(scaled.hp).toBeGreaterThan(100000);
        });

        it('Zone 501: 성장률 1.12로 전환', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, 501);
            
            // BigNumber로 정확한 계산 (구현과 동일한 방식)
            const expected = Math.floor(new BigNumber(100).times(new BigNumber(1.12).pow(501)).toNumber());
            expect(scaled.hp).toBe(expected);
        });
    });

    describe('Zone Level 1000+', () => {
        it('Zone 1000: baseHP > 10억', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, 1000);
            
            expect(scaled.hp).toBeGreaterThan(1000000000);
        });

        it('Zone 1001: 성장률 1.15로 전환', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, 1001);
            
            // BigNumber로 정확한 계산 (구현과 동일한 방식)
            const expected = Math.floor(new BigNumber(100).times(new BigNumber(1.15).pow(1001)).toNumber());
            expect(scaled.hp).toBe(expected);
        });
    });

    describe('Edge Cases', () => {
        it('Zone Level 0은 Zone 1로 처리', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, 0);
            
            expect(scaled.hp).toBeCloseTo(105, 0);
        });

        it('음수 Zone Level은 Zone 1로 처리', () => {
            const scaled = getScaledMonsterStats(100, 10, 5, -5);
            
            expect(scaled.hp).toBeCloseTo(105, 0);
        });

        it('Base Stat이 0이면 0 반환', () => {
            const scaled = getScaledMonsterStats(0, 0, 0, 100);
            
            expect(scaled.hp).toBe(0);
            expect(scaled.atk).toBe(0);
            expect(scaled.def).toBe(0);
        });
    });
});
