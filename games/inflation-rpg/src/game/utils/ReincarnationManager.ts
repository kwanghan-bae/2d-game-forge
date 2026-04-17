import { GameState } from '../GameState';

/**
 * 환생(Reincarnation) 시스템을 총괄 관리하는 클래스입니다.
 * 플레이어의 레벨과 보스 격파 실적에 따른 영혼석 계산, 영혼 등급 상승, 게임 초기화 로직을 담당합니다.
 */
export class ReincarnationManager {
  /** ReincarnationManager의 싱글톤 인스턴스 */
  private static instance: ReincarnationManager;

  /**
   * ReincarnationManager의 생성자입니다. 싱글톤 패턴을 강제합니다.
   */
  private constructor() {}

  /**
   * ReincarnationManager의 싱글톤 인스턴스를 반환합니다.
   * @returns ReincarnationManager 인스턴스
   */
  static getInstance(): ReincarnationManager {
    if (!ReincarnationManager.instance) {
      ReincarnationManager.instance = new ReincarnationManager();
    }
    return ReincarnationManager.instance;
  }

  /**
   * 테스트용 Singleton 초기화
   */
  static resetInstance(): void {
    ReincarnationManager.instance = null as any;
  }

  /**
   * 영혼석 계산
   * 공식: floor(level / 100) + defeatedBosses.length * 50
   * 
   * @param level 플레이어 레벨
   * @param defeatedBosses 격파한 보스의 ID 배열
   * @returns 획득한 영혼석 개수
   */
  calculateSoulStones(level: number, defeatedBosses: number[]): number {
    const baseStones = Math.floor(level / 100);
    const bossBonus = defeatedBosses.length * 50;
    return baseStones + bossBonus;
  }

  /**
   * 영혼 등급 상승에 필요한 영혼석
   * 
   * @param currentGrade 현재 영혼 등급 (0-5)
   * @returns 다음 등급으로 올리는데 필요한 영혼석 개수
   */
  getRequiredStones(currentGrade: number): number {
    const requirements = [100, 300, 800, 1500, 2500];
    return requirements[currentGrade] ?? Infinity;
  }

  /**
   * 영혼석으로 등급 상승 시도
   * 보유한 영혼석으로 가능한 만큼 등급을 올림
   * 
   * @param currentGrade 현재 영혼 등급
   * @param totalStones 보유한 영혼석
   * @returns 새로운 등급과 남은 영혼석
   */
  tryIncreaseSoulGrade(currentGrade: number, totalStones: number): {
    newGrade: number;
    remainingStones: number;
  } {
    let grade = currentGrade;
    let stones = totalStones;

    // 최대 등급(5)까지 도달 가능하도록 반복
    while (grade < 5) {
      const required = this.getRequiredStones(grade);
      if (stones >= required) {
        stones -= required;
        grade++;
      } else {
        break;
      }
    }

    return { newGrade: grade, remainingStones: stones };
  }

  /**
   * 환생 실행
   * 플레이어의 스탯을 초기화하고 영혼 등급을 상승시킴
   * 영혼 등급, 해금된 직업, 격파한 보스는 유지됨
   * 
   * @param gameState 게임 상태
   * @param earnedStones 게임오버 시 획득한 영혼석
   * @returns 새로운 영혼 등급과 해금된 직업 목록
   */
  reincarnate(gameState: GameState, earnedStones: number): {
    newSoulGrade: number;
    unlockedClasses: string[];
  } {
    // 1. 유지해야 할 항목 저장
    const defeatedBosses = [...gameState.defeatedBosses];

    // 2. 영혼 등급 상승 시도
    const result = this.tryIncreaseSoulGrade(
      gameState.soulGrade,
      earnedStones
    );
    const newSoulGrade = result.newGrade;

    // 3. GameState 초기화 (스탯, 인벤토리, 장비 등)
    gameState.reset();

    // 4. 영혼 등급 복원 (reset에서 초기화되기 때문에 다시 설정)
    gameState.soulGrade = newSoulGrade;

    // 5. 격파한 보스 기록 복원
    gameState.defeatedBosses = defeatedBosses;

    // 6. 새로운 영혼 등급에 따라 직업 해금 업데이트
    gameState.updateUnlockedClassesBySoulGrade();

    return {
      newSoulGrade: newSoulGrade,
      unlockedClasses: [...gameState.unlockedClasses]
    };
  }
}
