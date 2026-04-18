---
title: Phase 1.5a — @forge/core 선제 Contracts
date: 2026-04-18
status: approved (initial)
---

# @forge/core 선제 Contracts 설계 스펙

## §0 개요

Phase 1 종료 시점 `@forge/core` 는 `GameManifest` 스키마만 가지고 있다.
"3의 규칙" 에 따라 구현은 게임 #2 도착 전까지 승격하지 않는다. 하지만
**타입과 계약**은 구현을 강제하지 않으므로 미리 정의해도 안전하다. 이
스펙은 그 범위를 3개 항목으로 한정한다.

**왜 지금:**
- `StartGame` 반환이 `unknown` 으로 누수되어 dev-shell 에 duck-type 이
  흩어져 있다 (`apps/dev-shell/src/components/GameMountInner.tsx`,
  `apps/dev-shell/src/lib/registry.ts`).
- `exposeTestHooks` 가 inflation-rpg 내부에만 존재한다. 게임 #2 가 오면 각자
  비슷한 걸 만들어 슬롯 이름이 흩어진다.
- `SaveManager` 는 Phase 1 에서 upstream 키 (`'korea_inflation_rpg_save'`) 를
  그대로 쓰고 있다. 게임 #2 도착 시 namespace 도입과 함께 `@forge/core` 로
  승격될 확률이 매우 높다. envelope shape 을 지금 박제해두면 승격이 부드러워진다.

**범위 (3개):**

1. `ForgeGameInstance` — 게임 인스턴스 구조 타입 (신규).
2. `exposeTestHooks` + `TestHookSlots` — inflation-rpg 에서 `@forge/core` 로
   승격 (mechanical 이동). well-known 슬롯 네이밍 표준화.
3. `createSaveEnvelopeSchema<T>` — Zod 세이브 envelope 헬퍼 (신규).

**비범위** (이번엔 안 함):

- `SaveManager` 구현 자체 — 여전히 inflation-rpg 내부.
- `EventBus`, `I18nManager` 계약 — 게임 #2 가 실제 쓰는 모양을 본 뒤 결정.
- `GameLifecycle` enum.
- 마이그레이션 헬퍼 함수 — envelope shape 만 박제, migrate 로직은 승격 시점.

**성공 기준:**

1. `@forge/core` 가 3개 contract 을 공개 export 한다.
2. inflation-rpg 가 `exposeTestHooks` 를 `@forge/core` 에서 import 한다
   (승격의 mechanical 이동 완료).
3. dev-shell 의 `registry.ts` 와 `GameMountInner.tsx` 가 `ForgeGameInstance`
   타입을 사용하고 `unknown` 캐스팅이 제거된다.
4. `@forge/core` 의 vitest 가 4 테스트 (기존 manifest) 에서 15~20개로 늘어난다.
5. 기존 `phase-1-complete` 파이프라인 (turbo typecheck / lint / test, portal +
   game E2E) 이 모두 통과한다.

---

## §1 `ForgeGameInstance`

**파일:** `packages/2d-core/src/game-instance.ts` (신규)

```ts
/**
 * forge 의 게임 인스턴스가 최소한으로 만족해야 하는 형태.
 *
 * Phaser.Game 이 현재 유일한 구현이지만, @forge/core 는 Phaser 에 의존하지
 * 않는다. 새 게임 엔진(예: 다른 2D 라이브러리)이 들어와도 이 계약만 만족하면
 * forge dev-shell 과 CLI 가 그대로 동작한다.
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
```

**배럴 추가** (`packages/2d-core/src/index.ts`):

```ts
export type { ForgeGameInstance, StartGameFn } from './game-instance';
```

**하향 영향:**

- `games/inflation-rpg/src/startGame.ts` 의 `StartGame` 반환 타입을
  `Phaser.Game` 대신 `ForgeGameInstance` 로 변경 (Phaser.Game 이 구조적으로
  이 타입을 만족).
- `apps/dev-shell/src/lib/registry.ts` 의 `load` 반환 shape 의 `StartGame` 반환
  타입을 `unknown` → `ForgeGameInstance`.
- `apps/dev-shell/src/components/GameMountInner.tsx` 의 `gameInstance: {
  destroy?: ... } | null` 인라인 타입을 `ForgeGameInstance | null` 로.

**테스트** (`packages/2d-core/tests/game-instance.test.ts`):

```ts
import { describe, it, expectTypeOf } from 'vitest';
import type { ForgeGameInstance } from '../src';

describe('ForgeGameInstance', () => {
  it('accepts minimal destroy shape', () => {
    const fake: ForgeGameInstance = { destroy: () => {} };
    expectTypeOf(fake).toEqualTypeOf<ForgeGameInstance>();
  });

  it('destroy accepts optional removeCanvas', () => {
    const fake: ForgeGameInstance = {
      destroy: (removeCanvas?: boolean) => { void removeCanvas; },
    };
    void fake.destroy(true);
  });
});
```

---

## §2 `exposeTestHooks` 승격 + `TestHookSlots` 표준화

**문제:** `games/inflation-rpg/src/game/testHooks.ts` 안에만 존재. 게임 #2 가
오면 별도 구현 → 슬롯 네이밍 분산.

**해결:** `@forge/core` 로 이동. well-known 슬롯 2 개를 제안하되 임의 확장
허용.

### 파일

**신규:** `packages/2d-core/src/test-hooks.ts`

```ts
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
 * 커스텀 슬롯의 타입 안전성은 호출 측에서 책임진다
 * (`exposeTestHooks<T>` 제네릭).
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
```

**배럴 추가:**

```ts
export { exposeTestHooks } from './test-hooks';
export type { StandardTestHookSlots, TestHookSlots } from './test-hooks';
```

### inflation-rpg mechanical 이동

**삭제:** `games/inflation-rpg/src/game/testHooks.ts`

**수정:** `games/inflation-rpg/src/startGame.ts` — import 경로 교체
```ts
// 변경 전
import { exposeTestHooks } from './game/testHooks';
// 변경 후
import { exposeTestHooks } from '@forge/core';
```

**슬롯 이름 통일:** inflation-rpg 의 기존 `phaserGame` 슬롯을 `gameInstance` 로
개명한다. 표준 well-known 슬롯과 정렬하기 위함.

- 변경 대상: `games/inflation-rpg/src/startGame.ts`, E2E helper
  (`games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts`), 실제 E2E spec
  (`games/inflation-rpg/tests/e2e/full-game-flow.spec.ts`).
- `window.phaserGame` → `window.gameInstance` 일괄 치환.
- 기타 inflation-rpg 고유 슬롯 (`gameState`, `inflationManager`,
  `ReincarnationManager`, `E2E_AUTO_BATTLE`) 은 **그대로 유지** — 게임-specific
  커스텀 슬롯으로 남는다.

### 테스트

`packages/2d-core/tests/test-hooks.test.ts` (신규):

```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { exposeTestHooks } from '../src';

describe('exposeTestHooks', () => {
  beforeEach(() => {
    for (const key of ['gameInstance', 'currentScene', 'customKey']) {
      delete (window as unknown as Record<string, unknown>)[key];
    }
  });

  it('attaches well-known slots to window', () => {
    const fakeInstance = { destroy: () => {} };
    exposeTestHooks({ gameInstance: fakeInstance });
    expect((window as unknown as { gameInstance: unknown }).gameInstance)
      .toBe(fakeInstance);
  });

  it('attaches custom slots too', () => {
    exposeTestHooks({ customKey: 42 });
    expect((window as unknown as { customKey: number }).customKey).toBe(42);
  });

  it('skips undefined values', () => {
    exposeTestHooks({ gameInstance: undefined, currentScene: 'scene' });
    expect('gameInstance' in window).toBe(false);
    expect((window as unknown as { currentScene: string }).currentScene)
      .toBe('scene');
  });
});
```

---

## §3 `createSaveEnvelopeSchema<T>`

**문제:** Phase 1 에서 `SaveManager` 는 upstream 키를 그대로 쓰며
envelope 형태가 inflation-rpg 내부에만 정의되어 있다. 게임 #2 도착 시
승격하려면 envelope shape 이 standard 여야 한다.

**해결:** envelope **스키마만** `@forge/core` 에 박제. 이번 단계에서는
inflation-rpg 가 아직 이 헬퍼를 쓰지 않는다. 승격과 함께 점진 적용.

### 파일

**신규:** `packages/2d-core/src/save-envelope.ts`

```ts
import { z } from 'zod';

const metaShape = {
  /**
   * 게임별 세이브 스키마의 버전. semver 또는 단조 증가 문자열 권장
   * (예: "1.0.0", "2.0.0"). SaveManager 가 승격되면 이 값을 보고
   * 마이그레이션 경로를 고른다.
   */
  version: z.string().min(1),
  /** Unix epoch ms. 세이브가 쓰여진 시각. 정렬·표시용. */
  timestamp: z.number().int().nonnegative(),
  /**
   * 네임스페이스. 지금은 선택(단일 게임 로컬은 불필요). 게임 #2 도착 시
   * SaveManager 가 이 값으로 `localStorage` 키 prefix 를 만든다.
   */
  namespace: z.string().optional(),
};

/**
 * 게임별 데이터 스키마를 받아, 표준 envelope 로 감싼 Zod 스키마를 만든다.
 *
 * @example
 * const InflationSaveData = z.object({ level: z.number(), gold: z.string() });
 * const InflationSave = createSaveEnvelopeSchema(InflationSaveData);
 * type InflationSave = z.infer<typeof InflationSave>;
 */
export function createSaveEnvelopeSchema<T extends z.ZodTypeAny>(
  dataSchema: T,
): z.ZodObject<typeof metaShape & { data: T }> {
  return z.object({
    ...metaShape,
    data: dataSchema,
  });
}

/**
 * 데이터 스키마 없이 envelope 메타만 파싱하고 싶을 때.
 * (마이그레이션 시 먼저 envelope 을 열어 `version` 확인 → 적절한 data 스키마
 * 로 재파싱하는 용도.)
 */
export const SaveEnvelopeMeta = z.object(metaShape);
```

**배럴 추가:**

```ts
export { createSaveEnvelopeSchema, SaveEnvelopeMeta } from './save-envelope';
```

### 테스트

`packages/2d-core/tests/save-envelope.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createSaveEnvelopeSchema, SaveEnvelopeMeta } from '../src';

describe('createSaveEnvelopeSchema', () => {
  const FakeData = z.object({ x: z.number() });
  const FakeEnvelope = createSaveEnvelopeSchema(FakeData);

  it('wraps data with version + timestamp meta', () => {
    const parsed = FakeEnvelope.parse({
      version: '1.0.0',
      timestamp: 1700000000000,
      data: { x: 42 },
    });
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.timestamp).toBe(1700000000000);
    expect(parsed.data.x).toBe(42);
  });

  it('accepts optional namespace', () => {
    const parsed = FakeEnvelope.parse({
      version: '1.0.0',
      timestamp: 0,
      namespace: 'inflation-rpg',
      data: { x: 1 },
    });
    expect(parsed.namespace).toBe('inflation-rpg');
  });

  it('rejects empty version', () => {
    expect(() =>
      FakeEnvelope.parse({ version: '', timestamp: 0, data: { x: 1 } }),
    ).toThrow();
  });

  it('rejects negative timestamp', () => {
    expect(() =>
      FakeEnvelope.parse({
        version: '1.0.0',
        timestamp: -1,
        data: { x: 1 },
      }),
    ).toThrow();
  });

  it('fails when data does not match inner schema', () => {
    expect(() =>
      FakeEnvelope.parse({
        version: '1.0.0',
        timestamp: 0,
        data: { x: 'oops' },
      }),
    ).toThrow();
  });
});

describe('SaveEnvelopeMeta', () => {
  it('parses envelope meta without caring about data', () => {
    const parsed = SaveEnvelopeMeta.parse({
      version: '2.0.0',
      timestamp: 1700000000000,
      data: { anything: 'goes' },
    });
    expect(parsed.version).toBe('2.0.0');
  });
});
```

### 이번 단계에 inflation-rpg 는 이 헬퍼를 쓰지 않는다

- 기존 `games/inflation-rpg/src/game/utils/SaveManager.ts` 는 그대로 유지.
- envelope 헬퍼는 존재만 하고, 실제 채택은 게임 #2 도착 시 SaveManager 승격
  PR 에서.

---

## §4 배럴 export 최종 모양

`packages/2d-core/src/index.ts`:

```ts
export { GameManifest, parseGameManifest } from './manifest';
export type { GameManifestInput, GameManifestValue } from './manifest';

export type { ForgeGameInstance, StartGameFn } from './game-instance';

export { exposeTestHooks } from './test-hooks';
export type { StandardTestHookSlots, TestHookSlots } from './test-hooks';

export { createSaveEnvelopeSchema, SaveEnvelopeMeta } from './save-envelope';
```

---

## §5 작업 순서 제안 (구체 plan 에서 확정)

1. `@forge/core` 에 3개 파일 (`game-instance.ts`, `test-hooks.ts`,
   `save-envelope.ts`) + 테스트 추가.
2. `@forge/core/src/index.ts` 배럴 업데이트.
3. inflation-rpg 의 `testHooks.ts` 삭제 + `startGame.ts` import 경로 교체.
4. `phaserGame` → `gameInstance` 슬롯 rename (startGame + E2E helper + spec
   일괄 치환).
5. dev-shell 의 `registry.ts` / `GameMountInner.tsx` 를 `ForgeGameInstance`
   타입으로 교체. `unknown` 캐스팅 제거.
6. 전체 파이프라인 검증 (typecheck / lint / test, 포털 + 게임 E2E).
7. docs 업데이트: `packages/2d-core/README.md` 의 "현재 공개 API" 와 "승격
   후보" 섹션 갱신. `docs/ARCHITECTURE.md` 의 §8 (알려진 부채) 에서 "StartGame
   반환 타입 `unknown`" 항목 제거.

---

## §6 비목표 (do not)

- `SaveManager` 구현을 `@forge/core` 로 이동하지 않는다.
- `EventBus` · `I18nManager` · `GameLifecycle` 등을 추가하지 않는다 (게임 #2
  필요 시 별도 승격 PR).
- 마이그레이션 함수 (`migrate(raw, from, to)`) 를 만들지 않는다.
- inflation-rpg 의 `localStorage` 키 (`'korea_inflation_rpg_save'`) 를 namespace
  로 옮기지 않는다 (게임 #2 도착 시 진행).
- 기존 Vitest / Playwright 테스트를 리팩터하지 않는다 (슬롯 rename 에 따른
  최소 수정만).
- `packages/2d-core` 가 Phaser 에 의존하게 만들지 않는다.

---

## §7 위험과 완화

- **슬롯 rename (`phaserGame` → `gameInstance`) 중 E2E 깨짐**: 현재 E2E 는 3
  테스트 + helper 하나라 sed 일괄 치환 범위 좁음. 치환 후 `pnpm --filter
  @forge/game-inflation-rpg e2e` 로 즉시 검증.
- **`@forge/core` 의 vitest jsdom 전환 여부**: 현재 `packages/2d-core/vitest.config.ts`
  가 `environment: 'node'` 다. `exposeTestHooks` 테스트는 `window` 가 필요하니
  jsdom 또는 happy-dom 으로 바꿔야 한다. 작은 변경이지만 빠뜨리면 테스트
  부팅 자체 실패.
- **Phaser.Game 이 `ForgeGameInstance` 를 구조적으로 만족하지 않을 가능성**:
  Phaser.Game 의 `destroy` 시그니처는 `destroy(removeCanvas?: boolean,
  noReturn?: boolean): void`. 추가 optional 파라미터가 있어도 구조적 호환
  가능. 교체 후 tsc 가 판단.
