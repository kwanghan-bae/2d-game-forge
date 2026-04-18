/**
 * forge 의 게임 인스턴스가 최소한으로 만족해야 하는 형태.
 *
 * Phaser.Game 이 현재 유일한 구현이지만, @forge/core 는 Phaser 에 의존하지
 * 않는다. 새 게임 엔진이 들어와도 이 계약만 만족하면 forge dev-shell 과
 * CLI 가 그대로 동작한다.
 */
export interface ForgeGameInstance {
  /**
   * 게임 인스턴스 정리. dev-shell 이 route 이동 시 호출한다.
   * `removeCanvas` 가 true 면 캔버스 DOM 도 제거 (Phaser 관행).
   */
  destroy(removeCanvas?: boolean): void;
}

/**
 * `StartGame(config)` 이 반환해야 하는 시그니처.
 * 게임 패키지가 이 타입으로 `StartGame` 을 선언하면 dev-shell registry 와
 * 자동으로 호환된다.
 */
export type StartGameFn<TConfig = unknown> = (config: TConfig) => ForgeGameInstance;
