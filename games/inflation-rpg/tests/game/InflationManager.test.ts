import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InflationManager } from '../../src/game/utils/InflationManager';

describe('InflationManager', () => {
  let inflationManager: InflationManager;

  beforeEach(() => {
    inflationManager = InflationManager.getInstance();
    inflationManager.reset();
    inflationManager.setInflationRate(0.02);
  });

  afterEach(() => {
    // 모킹된 타이머 복원
    vi.restoreAllMocks();
  });

  describe('초기화 (Initialization)', () => {
    it('싱글톤 인스턴스를 반환해야 함', () => {
      const instance1 = InflationManager.getInstance();
      const instance2 = InflationManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('초기 시작 시간이 설정되어야 함', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);
      
      inflationManager.reset();
      const elapsedMinutes = inflationManager.getElapsedMinutes();
      
      expect(elapsedMinutes).toBe(0);
    });

    it('기본 인플레이션율이 2%(0.02)로 초기화되어야 함', () => {
      const rate = inflationManager.getInflationRate();
      expect(rate).toBe(0.02);
    });
  });

  describe('시간 추적 (Time Tracking)', () => {
    it('경과 시간을 분 단위로 정확히 계산해야 함', () => {
      const startTime = 1000000000000; // 임의의 시작 시간
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime) // reset() 호출 시
        .mockReturnValueOnce(startTime + 60000); // getElapsedMinutes() 호출 시 (1분 후)

      inflationManager.reset();
      const elapsedMinutes = inflationManager.getElapsedMinutes();

      expect(elapsedMinutes).toBe(1);
    });

    it('여러 분이 경과한 경우 정확히 계산해야 함', () => {
      const startTime = 1000000000000;
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime) // reset()
        .mockReturnValueOnce(startTime + 300000); // 5분 후

      inflationManager.reset();
      const elapsedMinutes = inflationManager.getElapsedMinutes();

      expect(elapsedMinutes).toBe(5);
    });

    it('reset() 호출 시 시간이 초기화되어야 함', () => {
      const startTime = 1000000000000;
      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime) // 첫 번째 reset()
        .mockReturnValueOnce(startTime + 60000) // getElapsedMinutes() - 1분 경과
        .mockReturnValueOnce(startTime + 120000) // 두 번째 reset()
        .mockReturnValueOnce(startTime + 120000); // 새로운 getElapsedMinutes() - 0분

      inflationManager.reset();
      expect(inflationManager.getElapsedMinutes()).toBe(1);

      inflationManager.reset();
      expect(inflationManager.getElapsedMinutes()).toBe(0);
    });
  });

  describe('가격 계산 (Price Calculation)', () => {
    it('0분 경과 시 원가를 그대로 반환해야 함', () => {
      const basePrice = 100;
      const startTime = Date.now();
      
      vi.spyOn(Date, 'now').mockReturnValue(startTime);
      inflationManager.reset();

      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);
      expect(inflatedPrice).toBe(100);
    });

    it('1분 경과 시 2% 인플레이션이 적용되어야 함', () => {
      const basePrice = 100;
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime) // reset()
        .mockReturnValueOnce(startTime + 60000); // getInflatedPrice() - 1분 후

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      // 100 * (1.02)^1 = 102
      expect(inflatedPrice).toBe(102);
    });

    it('5분 경과 시 지수 성장이 정확히 계산되어야 함', () => {
      const basePrice = 100;
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime) // reset()
        .mockReturnValueOnce(startTime + 300000); // 5분 후

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      // 100 * (1.02)^5 = 110.408...
      expect(inflatedPrice).toBeCloseTo(110.41, 1);
    });

    it('10분 경과 시 복리 계산이 정확해야 함', () => {
      const basePrice = 1000;
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 600000); // 10분 후

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      // 1000 * (1.02)^10 = 1218.99...
      expect(inflatedPrice).toBeCloseTo(1219.0, 0);
    });

    it('소수점 가격도 정확히 계산해야 함', () => {
      const basePrice = 50.5;
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 60000); // 1분 후

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      // 50.5 * 1.02 = 51.51
      expect(inflatedPrice).toBeCloseTo(51.51, 2);
    });

    it('100분 경과 시 큰 숫자 정확도를 유지해야 함', () => {
      const basePrice = 5000;
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 6000000);

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      // 5000 * (1.02)^100 = 36223.23...
      expect(inflatedPrice).toBeCloseTo(36223, 0);
    });
  });

  describe('설정 (Configuration)', () => {
    it('인플레이션율을 변경할 수 있어야 함', () => {
      inflationManager.setInflationRate(0.05);
      expect(inflationManager.getInflationRate()).toBe(0.05);
    });

    it('커스텀 인플레이션율로 가격이 계산되어야 함', () => {
      const basePrice = 100;
      const startTime = 1000000000000;

      inflationManager.setInflationRate(0.05);

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 60000);

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      // 100 * (1.05)^1 = 105
      expect(inflatedPrice).toBe(105);
    });

    it('0% 인플레이션율 설정 시 가격이 변하지 않아야 함', () => {
      const basePrice = 100;
      const startTime = 1000000000000;

      inflationManager.setInflationRate(0);

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 60000);

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      expect(inflatedPrice).toBe(100);
    });

    it('음수 인플레이션율(디플레이션)도 처리해야 함', () => {
      const basePrice = 100;
      const startTime = 1000000000000;

      inflationManager.setInflationRate(-0.02);

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 60000);

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      // 100 * (0.98)^1 = 98
      expect(inflatedPrice).toBe(98);
    });
  });

  describe('현재 인플레이션율 조회 (Current Inflation Rate)', () => {
    it('getCurrentInflationRate()가 백분율로 반환되어야 함', () => {
      inflationManager.setInflationRate(0.02);
      const rate = inflationManager.getCurrentInflationRate();
      
      // 0.02 -> 2.0 (%)
      expect(rate).toBe(2.0);
    });

    it('5% 인플레이션율이 정확히 반환되어야 함', () => {
      inflationManager.setInflationRate(0.05);
      const rate = inflationManager.getCurrentInflationRate();
      
      expect(rate).toBe(5.0);
    });
  });

  describe('엣지 케이스 (Edge Cases)', () => {
    it('가격이 0인 경우 0을 반환해야 함', () => {
      const basePrice = 0;
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 60000);

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      expect(inflatedPrice).toBe(0);
    });

    it('음수 가격은 절댓값으로 계산되어야 함', () => {
      const basePrice = -100;
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 60000);

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      // Math.abs(-100) * (1.02)^1 = 102
      expect(inflatedPrice).toBe(102);
    });

    it('매우 큰 시간(1000분) 경과에도 계산이 완료되어야 함', () => {
      const basePrice = 100;
      const startTime = 1000000000000;

      vi.spyOn(Date, 'now')
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(startTime + 60000000);

      inflationManager.reset();
      const inflatedPrice = inflationManager.getInflatedPrice(basePrice);

      // 100 * (1.02)^1000 = 매우 큰 숫자 (JavaScript Math.pow 한계로 약 3.98e10)
      expect(inflatedPrice).toBeGreaterThan(1e10);
    });
  });
});
