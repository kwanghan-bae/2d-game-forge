import { describe, it, expect } from 'vitest';
import { NumberFormatter } from '../src/game/utils/NumberFormatter';

describe('NumberFormatter', () => {
    describe('formatCompact - 경계값', () => {
        it('0은 "0"으로 표시', () => {
            expect(NumberFormatter.formatCompact(0)).toBe('0');
        });

        it('999 이하는 그대로 표시', () => {
            expect(NumberFormatter.formatCompact(1)).toBe('1');
            expect(NumberFormatter.formatCompact(999)).toBe('999');
        });

        it('1,000은 "1K"', () => {
            expect(NumberFormatter.formatCompact(1000)).toBe('1K');
        });

        it('999,999는 "1000K" (소수점 없이)', () => {
            expect(NumberFormatter.formatCompact(999999)).toBe('1000K');
        });

        it('1,000,000은 "1M"', () => {
            expect(NumberFormatter.formatCompact(1000000)).toBe('1M');
        });

        it('1,000,000,000은 "1B"', () => {
            expect(NumberFormatter.formatCompact(1000000000)).toBe('1B');
        });

        it('1,000,000,000,000은 "1T"', () => {
            expect(NumberFormatter.formatCompact(1000000000000)).toBe('1T');
        });

        it('10^16은 "1Ky"', () => {
            expect(NumberFormatter.formatCompact(10000000000000000)).toBe('1Ky');
        });

        it('10^20은 "1Ha"', () => {
            expect(NumberFormatter.formatCompact(100000000000000000000)).toBe('1Ha');
        });
    });

    describe('formatCompact - 소수점 처리', () => {
        it('1,234는 "1.23K" (소수점 2자리)', () => {
            expect(NumberFormatter.formatCompact(1234)).toBe('1.23K');
        });

        it('1,567,890은 "1.57M" (반올림)', () => {
            expect(NumberFormatter.formatCompact(1567890)).toBe('1.57M');
        });

        it('1,999,999는 "2M" (반올림으로 올림)', () => {
            expect(NumberFormatter.formatCompact(1999999)).toBe('2M');
        });

        it('1.005M은 "1.01M" (소수점 반올림)', () => {
            expect(NumberFormatter.formatCompact(1005000)).toBe('1.01M');
        });
    });

    describe('formatCompact - 큰 숫자', () => {
        it('10^24는 "10000Ha" (Ha 초과 시 Ha로 표시)', () => {
            expect(NumberFormatter.formatCompact(1e24)).toBe('10000Ha');
        });

        it('레벨 1000 ATK: 약 10^20 → Ha 단위', () => {
            // 10 * 1.15^1000 ≈ 1.25 * 10^60 (실제 계산값)
            // 하지만 JavaScript Number는 10^308까지만 지원
            // BigNumber로 처리 시 Ha 단위로 표시될 것
            const largeNum = 1e25;
            expect(NumberFormatter.formatCompact(largeNum)).toContain('Ha');
        });
    });

    describe('formatCompact - 특수 케이스', () => {
        it('소수점이 .00이면 생략', () => {
            expect(NumberFormatter.formatCompact(1000000)).toBe('1M');
            expect(NumberFormatter.formatCompact(5000000)).toBe('5M');
        });

        it('소수점이 .X0이면 한 자리만 표시', () => {
            expect(NumberFormatter.formatCompact(1100000)).toBe('1.1M');
            expect(NumberFormatter.formatCompact(1200000)).toBe('1.2M');
        });

        it('문자열 입력도 처리 (BigNumber 생성자 지원)', () => {
            expect(NumberFormatter.formatCompact('1000000')).toBe('1M');
            expect(NumberFormatter.formatCompact('1234567')).toBe('1.23M');
        });
    });

    describe('formatCompact - 엣지 케이스', () => {
        it('NaN은 "0"으로 처리', () => {
            expect(NumberFormatter.formatCompact(NaN)).toBe('0');
        });

        it('Infinity는 "∞"로 처리', () => {
            expect(NumberFormatter.formatCompact(Infinity)).toBe('∞');
        });

        it('음수는 절댓값으로 처리 (게임에서 음수 없음)', () => {
            expect(NumberFormatter.formatCompact(-1234)).toBe('1.23K');
        });
    });
});
