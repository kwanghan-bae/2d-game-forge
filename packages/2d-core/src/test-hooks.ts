import type { ForgeGameInstance } from './game-instance';

/**
 * dev-shell 과 E2E helper 가 기대하는 well-known 슬롯.
 *
 * 게임이 이 슬롯들을 채우면 forge 표준 E2E 도구로 검사할 수 있다. 채우지
 * 않아도 된다 — 커스텀 슬롯은 자유롭게 추가할 수 있다 (index signature).
 */
export interface StandardTestHookSlots {
  /** 최상위 게임 인스턴스. dev-shell 의 라이프사이클 관찰에 사용. */
  gameInstance?: ForgeGameInstance;
  /** 현재 활성 씬(엔진에 따라 타입이 다름 — unknown 으로 관대하게). */
  currentScene?: unknown;
}

/**
 * 게임이 추가 슬롯을 자유롭게 붙일 수 있도록 확장 가능한 shape.
 * 커스텀 슬롯의 타입 안전성은 호출 측에서 책임진다 (`exposeTestHooks<T>` 제네릭).
 */
export type TestHookSlots = StandardTestHookSlots & Record<string, unknown>;

/**
 * 주어진 슬롯들을 `window` 에 부착한다. SSR 환경(window 부재)에서는 no-op.
 *
 * 호출자는 반드시 "opt-in" 으로만 호출한다:
 * - release 빌드에서는 호출하지 말 것.
 * - dev-shell 에서는 `process.env.NODE_ENV !== 'production'` 로 게이트한다.
 */
export function exposeTestHooks<T extends TestHookSlots>(slots: T): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as Record<string, unknown>;
  for (const [key, value] of Object.entries(slots)) {
    if (value !== undefined) w[key] = value;
  }
}
