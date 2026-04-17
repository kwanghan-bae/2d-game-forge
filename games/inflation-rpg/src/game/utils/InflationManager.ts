import { InflationEventManager } from './InflationEventManager';

/**
 * 게임의 인플레이션 메커니즘을 총괄 관리하는 클래스입니다.
 * 시간이 지남에 따라 물가가 지수적으로 상승하는 로직을 담당하며,
 * 현재 적용 중인 인플레이션 이벤트를 합산하여 최종 물가를 계산합니다.
 */
export class InflationManager {
  /** InflationManager의 싱글톤 인스턴스 */
  private static instance: InflationManager;
  /** 인플레이션 계산의 기준점이 되는 시작 타임스탬프 */
  private startTime: number;
  /** 기본 인플레이션율 (매 분당 상승률) */
  private inflationRate: number;
  /** 인플레이션 이벤트를 관리하는 매니저 인스턴스 */
  private eventManager: InflationEventManager;

  /**
   * InflationManager의 생성자입니다. 초기값을 설정합니다.
   */
  private constructor() {
    this.startTime = Date.now();
    this.inflationRate = 0.02; // 기본 2%
    this.eventManager = InflationEventManager.getInstance();
  }

  /**
   * 싱글톤 인스턴스를 반환합니다.
   * @returns InflationManager 인스턴스
   */
  public static getInstance(): InflationManager {
    if (!InflationManager.instance) {
      InflationManager.instance = new InflationManager();
    }
    return InflationManager.instance;
  }

  /**
   * 인플레이션 시작 시간을 현재로 초기화합니다.
   */
  public reset(): void {
    this.startTime = Date.now();
  }

  /**
   * 게임 시작 후 경과된 시간을 분 단위로 반환합니다.
   * @returns 경과 시간 (분)
   */
  public getElapsedMinutes(): number {
    const currentTime = Date.now();
    const elapsedMs = currentTime - this.startTime;
    return elapsedMs / 60000;
  }

  /**
   * 기본 가격에 현재 인플레이션율과 경과 시간을 적용한 최종 가격을 계산합니다.
   * @param basePrice 원본 가격
   * @returns 인플레이션이 적용된 가격
   */
  public getInflatedPrice(basePrice: number): number {
    if (basePrice === 0) {
      return 0;
    }

    const absolutePrice = Math.abs(basePrice);
    const elapsedMinutes = this.getElapsedMinutes();
    const effectiveRate = this.eventManager.getEffectiveInflationRate(this.inflationRate);
    const growthFactor = 1 + effectiveRate;
    
    // 복리 계산 공식: P * (1 + r)^t
    return absolutePrice * Math.pow(growthFactor, elapsedMinutes);
  }

  /**
   * 기본 인플레이션율을 반환합니다.
   * @returns 기본 인플레이션율
   */
  public getInflationRate(): number {
    return this.inflationRate;
  }

  /**
   * 기본 인플레이션율을 설정합니다.
   * @param rate 설정할 인플레이션율 (예: 0.02 = 2%)
   */
  public setInflationRate(rate: number): void {
    this.inflationRate = rate;
  }

  /**
   * 현재 이벤트 효과가 포함된 실시간 인플레이션율(백분율)을 반환합니다.
   * @returns 현재 인플레이션율 (%)
   */
  public getCurrentInflationRate(): number {
    const effectiveRate = this.eventManager.getEffectiveInflationRate(this.inflationRate);
    return effectiveRate * 100;
  }

  /**
   * 인플레이션 시작 타임스탬프를 반환합니다.
   * @returns 시작 타임스탬프
   */
  public getStartTime(): number {
    return this.startTime;
  }

  /**
   * 인플레이션 시작 타임스탬프를 강제로 설정합니다. (데이터 로드용)
   * @param time 설정할 타임스탬프
   */
  public setStartTime(time: number): void {
    this.startTime = time;
  }

  /**
   * 내부 이벤트 매니저 인스턴스를 반환합니다.
   * @returns InflationEventManager 인스턴스
   */
  public getEventManager(): InflationEventManager {
    return this.eventManager;
  }
}
