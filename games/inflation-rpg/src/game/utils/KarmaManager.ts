/**
 * 카르마(업보) 관리 시스템
 * 플레이어의 업보 점수를 관리하고 상태를 추적합니다.
 * 
 * 범위: 0 ~ 999
 * 레벨:
 *   - saint: 0 ~ 29 (착한 플레이어)
 *   - normal: 30 ~ 99 (중간 플레이어)
 *   - sinner: 100 ~ 999 (악한 플레이어)
 */

/**
 * 플레이어의 업보(Karma) 수치를 관리하고 상태를 추적하는 클래스입니다.
 * 몬스터 처치 시 상승하며, 특정 보스전(염라대왕)에서의 즉사 조건이나 플레이어의 등급 판정에 사용됩니다.
 * 싱글톤 패턴으로 구현되었습니다.
 */
export class KarmaManager {
  /** KarmaManager의 싱글톤 인스턴스 */
  private static instance: KarmaManager;
  /** 현재 플레이어의 업보 수치 (0 ~ 999) */
  private karma: number = 0;
  /** 고업보(Sinner) 판정 기준점 */
  private readonly KARMA_THRESHOLD = 100;
  /** 업보 수치의 최대 허용값 */
  private readonly KARMA_MAX = 999;

  /**
   * KarmaManager의 생성자입니다. 싱글톤 패턴을 강제합니다.
   */
  private constructor() {}

  /**
   * KarmaManager 싱글톤 인스턴스 획득
   */
  public static getInstance(): KarmaManager {
    if (!KarmaManager.instance) {
      KarmaManager.instance = new KarmaManager();
    }
    return KarmaManager.instance;
  }

  /**
   * 현재 업보 값 조회
   */
  public getKarma(): number {
    return this.karma;
  }

  /**
   * 업보 값 설정
   */
  public setKarma(value: number): void {
    this.karma = Math.max(0, Math.min(this.KARMA_MAX, value));
  }

  /**
   * 업보 증가 (몬스터 처치 시)
   * 최대값은 999입니다.
   * @param amount 증가할 업보량 (기본값: 1)
   */
  public increaseKarma(amount: number = 1): void {
    if (amount < 0) {
      return;
    }
    this.karma = Math.min(this.KARMA_MAX, this.karma + amount);
  }

  /**
   * 업보 증가 (기존 메서드와 호환성)
   */
  public addKarma(amount: number): void {
    this.increaseKarma(amount);
  }

  /**
   * 업보 감소 (면죄부 사용 시)
   * @param amount 감소할 업보량
   */
  public decreaseKarma(amount: number): void {
    this.karma = Math.max(0, this.karma - amount);
  }

  /**
   * 업보 감소 (기존 메서드와 호환성)
   */
  public subtractKarma(amount: number): void {
    this.decreaseKarma(amount);
  }

  /**
   * 고업보 상태인지 확인 (염라대왕 즉사 조건)
   * 업보가 100 이상이면 true를 반환합니다.
   * @param threshold 임계값 (기본값: 100)
   */
  public isHighKarma(threshold: number = this.KARMA_THRESHOLD): boolean {
    return this.karma >= threshold;
  }

  /**
   * 업보 레벨을 조회합니다.
   * - 'saint': 0 ~ 29 (착한 플레이어)
   * - 'normal': 30 ~ 99 (중간 플레이어)
   * - 'sinner': 100 ~ 999 (악한 플레이어)
   */
  public getKarmaLevel(): 'saint' | 'normal' | 'sinner' {
    if (this.karma < 30) return 'saint';
    if (this.karma < 100) return 'normal';
    return 'sinner';
  }

  /**
   * 업보 리셋
   */
  public reset(): void {
    this.karma = 0;
  }

  /**
   * 업보 데이터를 JSON 형식으로 저장합니다.
   */
  public toJSON(): { karma: number } {
    return { karma: this.karma };
  }

  /**
   * JSON 형식의 업보 데이터를 복원합니다.
   */
  public fromJSON(data: { karma?: number }): void {
    this.karma = data.karma || 0;
  }
}

