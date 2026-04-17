import BigNumber from 'bignumber.js';

/**
 * 큰 수치를 사람이 읽기 쉬운 형식(K, M, B 등)으로 변환하는 유틸리티 클래스입니다.
 * 기하급수적으로 상승하는 게임 내 재화와 능력치를 처리합니다.
 */
export class NumberFormatter {
    /** 단위별 임계치 및 접미사 정의 목록 */
    private static readonly UNITS = [
        { threshold: new BigNumber(1e20), suffix: 'Ha' },
        { threshold: new BigNumber(1e16), suffix: 'Ky' },
        { threshold: new BigNumber(1e12), suffix: 'T' },
        { threshold: new BigNumber(1e9), suffix: 'B' },
        { threshold: new BigNumber(1e6), suffix: 'M' },
        { threshold: new BigNumber(1e3), suffix: 'K' }
    ];

    /**
     * 숫자를 단위 접미사(K/M/B/T 등)를 사용하여 압축된 문자열로 변환합니다.
     * @param value 변환할 숫자 (number, string, BigNumber)
     * @returns 압축된 문자열 (예: "1.23M", "5K", "999")
     */
    public static formatCompact(value: number | string | BigNumber): string {
        const bn = this.toValidBigNumber(value);
        if (bn.isNaN()) return '0';
        if (!bn.isFinite()) return '∞';

        const absValue = bn.abs();
        if (absValue.isZero()) return '0';
        if (absValue.isLessThan(1000)) return absValue.toFixed(0);

        return this.applyUnitSuffix(absValue);
    }

    /** 값을 BigNumber 객체로 안전하게 변환 */
    private static toValidBigNumber(value: any): BigNumber {
        try {
            return new BigNumber(value);
        } catch {
            return new BigNumber(NaN);
        }
    }

    /** 적절한 단위 접미사를 찾아 적용 */
    private static applyUnitSuffix(bn: BigNumber): string {
        for (const unit of this.UNITS) {
            if (bn.isGreaterThanOrEqualTo(unit.threshold)) {
                const divided = bn.dividedBy(unit.threshold);
                return `${this.formatDecimal(divided)}${unit.suffix}`;
            }
        }
        return bn.toFixed(0);
    }

    /**
     * 소수점 이하 숫자를 포맷팅합니다. (최대 2자리, 의미 없는 0 제거)
     * @param value 포맷팅할 수치
     */
    private static formatDecimal(value: BigNumber): string {
        const rounded = value.toFixed(2);
        const [integer, decimal] = rounded.split('.');

        if (!decimal || decimal === '00') return integer;
        if (decimal.endsWith('0')) return `${integer}.${decimal[0]}`;
        
        return rounded;
    }
}
