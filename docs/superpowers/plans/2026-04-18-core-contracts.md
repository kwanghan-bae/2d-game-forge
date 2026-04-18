# Phase 1.5a — @forge/core Core Contracts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `@forge/core` 에 3개의 타입·계약(ForgeGameInstance, exposeTestHooks, createSaveEnvelopeSchema) 을 추가·승격하고, inflation-rpg 의 `testHooks.ts` 를 `@forge/core` 로 mechanical 이동한다. dev-shell 의 `unknown` 누수를 제거한다.

**Architecture:** 타입 중심. 3개의 새 소스 파일 (`game-instance.ts`, `test-hooks.ts`, `save-envelope.ts`) 을 `@forge/core` 에 추가, 배럴 `index.ts` 갱신, inflation-rpg 와 dev-shell 의 consumer 코드를 `@forge/core` 로 연결. `SaveManager` 구현은 건드리지 않는다. 슬롯 이름 `phaserGame` → `gameInstance` 로 표준화.

**Tech Stack:** TypeScript 5, Zod 4.x, Vitest 4 (jsdom 환경 필요), Phaser 3.90 (구조적 호환만, @forge/core 는 의존 안 함).

**Spec:** `docs/superpowers/specs/2026-04-18-core-contracts-design.md`

**Prior tags:** `phase-0-complete`, `phase-1-complete`.

---

## File Structure

생성/수정되는 파일 (레포 루트 `/Users/joel/Desktop/git/2d-game-forge/` 기준):

```
packages/2d-core/
├── src/
│   ├── index.ts                         # MODIFIED: 배럴 export 추가
│   ├── manifest.ts                      # 기존, 변경 없음
│   ├── game-instance.ts                 # NEW: ForgeGameInstance, StartGameFn
│   ├── test-hooks.ts                    # NEW: exposeTestHooks, TestHookSlots
│   └── save-envelope.ts                 # NEW: createSaveEnvelopeSchema, SaveEnvelopeMeta
├── tests/
│   ├── manifest.test.ts                 # 기존, 변경 없음
│   ├── game-instance.test.ts            # NEW
│   ├── test-hooks.test.ts               # NEW
│   └── save-envelope.test.ts            # NEW
└── vitest.config.ts                     # MODIFIED: environment 'node' → 'jsdom'

games/inflation-rpg/
├── src/
│   ├── startGame.ts                     # MODIFIED: testHooks import 경로 + 슬롯 rename
│   └── game/
│       └── testHooks.ts                 # DELETED: @forge/core 로 승격
└── tests/e2e/
    ├── full-game-flow.spec.ts           # MODIFIED: window.phaserGame → window.gameInstance
    └── helpers/GameTestHelper.ts        # MODIFIED: 동일 치환

apps/dev-shell/
├── src/
│   ├── lib/registry.ts                  # MODIFIED: StartGame 반환 unknown → ForgeGameInstance
│   └── components/GameMountInner.tsx    # MODIFIED: duck-type 제거, ForgeGameInstance 사용

docs/
├── ARCHITECTURE.md                      # MODIFIED: §8 "StartGame 반환 unknown" 부채 항목 제거
└── ...

packages/2d-core/README.md               # MODIFIED: 공개 API 섹션 갱신, 승격 후보에서 exposeTestHooks/SaveEnvelope 항목 업데이트
```

각 파일 하나의 책임:
- `game-instance.ts` — `ForgeGameInstance` 인터페이스 + `StartGameFn` 제네릭 타입.
- `test-hooks.ts` — `TestHookSlots`/`StandardTestHookSlots` 타입 + `exposeTestHooks<T>` 함수.
- `save-envelope.ts` — `metaShape` 내부 상수 + `createSaveEnvelopeSchema<T>` + `SaveEnvelopeMeta` 파싱 Zod 객체.

---

## Task Order and Dependencies

태스크는 순차. 각 태스크는 커밋으로 끝난다. 의존성:

- 태스크 1 (vitest jsdom 전환) 은 이후 테스트들의 전제.
- 태스크 2~4 (3개 contract 파일 + 테스트) 는 독립이지만 배럴 업데이트 전엔 consumer 가 안 씀.
- 태스크 5 (배럴) 후 태스크 6~8 (inflation-rpg 이동, dev-shell 타입 연결, 슬롯 rename) 가능.
- 태스크 9 (문서 갱신) + 태스크 10 (최종 검증 + 태그) 는 마지막.

---

### Task 1: `@forge/core` vitest 환경을 jsdom 으로 전환

`exposeTestHooks` 테스트는 `window` 전역이 필요하다. 현재 `vitest.config.ts` 는 `environment: 'node'`.

**Files:**
- Modify: `packages/2d-core/vitest.config.ts`
- Add to devDependencies: `jsdom` (`packages/2d-core/package.json`)

- [ ] **Step 1: devDependency 에 jsdom 추가**

Run:
```bash
pnpm --filter @forge/core add -D jsdom
```
Expected: `packages/2d-core/package.json` 의 `devDependencies` 에 `jsdom` 이 추가되고 `pnpm-lock.yaml` 이 갱신된다.

- [ ] **Step 2: vitest.config.ts 수정**

Open `packages/2d-core/vitest.config.ts`. 현재 내용:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
```

다음으로 교체:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: 기존 테스트가 여전히 통과하는지 확인**

Run: `pnpm --filter @forge/core test 2>&1 | tail -10`
Expected: 기존 manifest 테스트 4 passed. jsdom 로 전환해도 node-only API 를 안 쓰므로 깨지지 않아야 한다.

- [ ] **Step 4: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add packages/2d-core/package.json packages/2d-core/vitest.config.ts pnpm-lock.yaml
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "chore(core): switch vitest to jsdom for upcoming window-dependent tests"
```

---

### Task 2: `ForgeGameInstance` + `StartGameFn` 타입 (TDD)

**Files:**
- Create: `packages/2d-core/src/game-instance.ts`
- Create: `packages/2d-core/tests/game-instance.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Write `packages/2d-core/tests/game-instance.test.ts`:
```ts
import { describe, it, expectTypeOf } from 'vitest';
import type { ForgeGameInstance, StartGameFn } from '../src/game-instance';

describe('ForgeGameInstance', () => {
  it('accepts minimal destroy shape', () => {
    const fake: ForgeGameInstance = { destroy: () => {} };
    expectTypeOf(fake).toEqualTypeOf<ForgeGameInstance>();
  });

  it('destroy accepts optional removeCanvas', () => {
    const fake: ForgeGameInstance = {
      destroy: (removeCanvas?: boolean) => {
        void removeCanvas;
      },
    };
    fake.destroy(true);
    fake.destroy();
  });
});

describe('StartGameFn', () => {
  it('returns a ForgeGameInstance given any config', () => {
    type Fn = StartGameFn<{ parent: string }>;
    const fn: Fn = () => ({ destroy: () => {} });
    const result = fn({ parent: 'x' });
    expectTypeOf(result).toMatchTypeOf<ForgeGameInstance>();
  });
});
```

- [ ] **Step 2: 실행해서 FAIL 확인**

Run: `pnpm --filter @forge/core test tests/game-instance.test.ts 2>&1 | tail -10`
Expected: FAIL — `Cannot find module '../src/game-instance'` 또는 동등.

- [ ] **Step 3: 구현 작성**

Write `packages/2d-core/src/game-instance.ts`:
```ts
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
```

- [ ] **Step 4: 실행해서 PASS 확인**

Run: `pnpm --filter @forge/core test tests/game-instance.test.ts 2>&1 | tail -10`
Expected: 3 passed (또는 expectTypeOf 호출당 1개씩).

- [ ] **Step 5: 전체 테스트 확인**

Run: `pnpm --filter @forge/core test 2>&1 | tail -10`
Expected: 이전 manifest 4 + 새 게임인스턴스 3 = 7 passed.

- [ ] **Step 6: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add packages/2d-core/src/game-instance.ts packages/2d-core/tests/game-instance.test.ts
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(core): add ForgeGameInstance and StartGameFn types"
```

---

### Task 3: `exposeTestHooks` + 슬롯 타입 (TDD)

**Files:**
- Create: `packages/2d-core/src/test-hooks.ts`
- Create: `packages/2d-core/tests/test-hooks.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Write `packages/2d-core/tests/test-hooks.test.ts`:
```ts
import { describe, expect, it, beforeEach } from 'vitest';
import { exposeTestHooks } from '../src/test-hooks';

describe('exposeTestHooks', () => {
  beforeEach(() => {
    for (const key of ['gameInstance', 'currentScene', 'customKey', 'extraA']) {
      delete (window as unknown as Record<string, unknown>)[key];
    }
  });

  it('attaches well-known slots to window', () => {
    const fakeInstance = { destroy: () => {} };
    exposeTestHooks({ gameInstance: fakeInstance });
    expect(
      (window as unknown as { gameInstance: unknown }).gameInstance,
    ).toBe(fakeInstance);
  });

  it('attaches custom slots too', () => {
    exposeTestHooks({ customKey: 42 });
    expect(
      (window as unknown as { customKey: number }).customKey,
    ).toBe(42);
  });

  it('skips undefined values', () => {
    exposeTestHooks({ gameInstance: undefined, currentScene: 'scene' });
    expect('gameInstance' in window).toBe(false);
    expect(
      (window as unknown as { currentScene: string }).currentScene,
    ).toBe('scene');
  });

  it('merges across multiple calls', () => {
    exposeTestHooks({ gameInstance: { destroy: () => {} } });
    exposeTestHooks({ extraA: 'a' });
    expect('gameInstance' in window).toBe(true);
    expect((window as unknown as { extraA: string }).extraA).toBe('a');
  });
});
```

- [ ] **Step 2: 실행해서 FAIL 확인**

Run: `pnpm --filter @forge/core test tests/test-hooks.test.ts 2>&1 | tail -10`
Expected: FAIL — `Cannot find module '../src/test-hooks'`.

- [ ] **Step 3: 구현 작성**

Write `packages/2d-core/src/test-hooks.ts`:
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
```

- [ ] **Step 4: 실행해서 PASS 확인**

Run: `pnpm --filter @forge/core test tests/test-hooks.test.ts 2>&1 | tail -10`
Expected: 4 passed.

- [ ] **Step 5: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add packages/2d-core/src/test-hooks.ts packages/2d-core/tests/test-hooks.test.ts
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(core): promote exposeTestHooks with StandardTestHookSlots"
```

---

### Task 4: `createSaveEnvelopeSchema<T>` + `SaveEnvelopeMeta` (TDD)

**Files:**
- Create: `packages/2d-core/src/save-envelope.ts`
- Create: `packages/2d-core/tests/save-envelope.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

Write `packages/2d-core/tests/save-envelope.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { createSaveEnvelopeSchema, SaveEnvelopeMeta } from '../src/save-envelope';

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

  it('rejects non-integer timestamp', () => {
    expect(() =>
      FakeEnvelope.parse({
        version: '1.0.0',
        timestamp: 1.5,
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
    expect(parsed.timestamp).toBe(1700000000000);
  });

  it('works without data field at all', () => {
    const parsed = SaveEnvelopeMeta.parse({
      version: '1.0.0',
      timestamp: 0,
    });
    expect(parsed.version).toBe('1.0.0');
  });
});
```

- [ ] **Step 2: 실행해서 FAIL 확인**

Run: `pnpm --filter @forge/core test tests/save-envelope.test.ts 2>&1 | tail -10`
Expected: FAIL — `Cannot find module '../src/save-envelope'`.

- [ ] **Step 3: 구현 작성**

Write `packages/2d-core/src/save-envelope.ts`:
```ts
import { z } from 'zod';

const metaShape = {
  /**
   * 게임별 세이브 스키마의 버전. semver 또는 단조 증가 문자열 권장
   * (예: "1.0.0", "2.0.0"). SaveManager 가 승격되면 이 값을 보고 마이그레이션
   * 경로를 고른다.
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

- [ ] **Step 4: 실행해서 PASS 확인**

Run: `pnpm --filter @forge/core test tests/save-envelope.test.ts 2>&1 | tail -10`
Expected: 8 passed.

- [ ] **Step 5: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add packages/2d-core/src/save-envelope.ts packages/2d-core/tests/save-envelope.test.ts
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(core): add createSaveEnvelopeSchema and SaveEnvelopeMeta"
```

---

### Task 5: 배럴 `src/index.ts` 갱신

**Files:**
- Modify: `packages/2d-core/src/index.ts`

- [ ] **Step 1: 현재 내용 읽기**

Run: `cat packages/2d-core/src/index.ts`
현재:
```ts
export { GameManifest, parseGameManifest } from './manifest';
export type { GameManifestInput, GameManifestValue } from './manifest';
```

- [ ] **Step 2: 3개 계약을 배럴에 추가**

파일 전체를 다음으로 교체:
```ts
export { GameManifest, parseGameManifest } from './manifest';
export type { GameManifestInput, GameManifestValue } from './manifest';

export type { ForgeGameInstance, StartGameFn } from './game-instance';

export { exposeTestHooks } from './test-hooks';
export type { StandardTestHookSlots, TestHookSlots } from './test-hooks';

export { createSaveEnvelopeSchema, SaveEnvelopeMeta } from './save-envelope';
```

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @forge/core typecheck 2>&1 | tail -5`
Expected: exit 0.

- [ ] **Step 4: 전체 `@forge/core` 테스트 통과 확인**

Run: `pnpm --filter @forge/core test 2>&1 | tail -10`
Expected: 전체 합 17 passed (manifest 4 + game-instance 3 + test-hooks 4 + save-envelope 8).

- [ ] **Step 5: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add packages/2d-core/src/index.ts
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "feat(core): re-export new contracts from package root"
```

---

### Task 6: inflation-rpg 의 `testHooks.ts` 를 `@forge/core` 로 승격

**Files:**
- Delete: `games/inflation-rpg/src/game/testHooks.ts`
- Modify: `games/inflation-rpg/src/startGame.ts`

- [ ] **Step 1: `startGame.ts` 읽기**

Run: `cat games/inflation-rpg/src/startGame.ts`
현재 import 중 `exposeTestHooks` 가 `./game/testHooks` 에서 온다.

- [ ] **Step 2: import 경로 교체**

Open `games/inflation-rpg/src/startGame.ts`. 다음 라인을 찾는다:
```ts
import { exposeTestHooks } from './game/testHooks';
```

다음으로 교체:
```ts
import { exposeTestHooks } from '@forge/core';
```

- [ ] **Step 3: 구 testHooks.ts 삭제**

Run: `rm games/inflation-rpg/src/game/testHooks.ts`

- [ ] **Step 4: typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | grep -E '^src/' | head -5`
Expected: production 파일에 에러 없음.

- [ ] **Step 5: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg/src
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "refactor(game-inflation-rpg): import exposeTestHooks from @forge/core"
```

---

### Task 7: 슬롯 이름 표준화 `phaserGame` → `gameInstance`

**Files:**
- Modify: `games/inflation-rpg/src/startGame.ts`
- Modify: `games/inflation-rpg/tests/e2e/full-game-flow.spec.ts`
- Modify: `games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts`

- [ ] **Step 1: startGame.ts 에서 슬롯 rename**

Open `games/inflation-rpg/src/startGame.ts`. `exposeTestHooks({...})` 호출 안에서 `phaserGame: game` 을 찾는다. 다음으로 교체:
```ts
      gameInstance: game,
```

(다른 슬롯 `gameState`, `inflationManager`, `ReincarnationManager` 는 게임-specific 으로 유지. `E2E_AUTO_BATTLE` 도 유지 — 있으면.)

- [ ] **Step 2: E2E spec 과 helper 에서 window 접근 rename**

`window.phaserGame` 참조를 `window.gameInstance` 로 일괄 치환.

Run (macOS BSD sed):
```bash
sed -i '' 's|window\.phaserGame|window.gameInstance|g' \
  games/inflation-rpg/tests/e2e/full-game-flow.spec.ts \
  games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts
```

치환 결과 확인:
```bash
grep -n 'gameInstance\|phaserGame' games/inflation-rpg/tests/e2e/full-game-flow.spec.ts games/inflation-rpg/tests/e2e/helpers/GameTestHelper.ts
```
Expected: `gameInstance` 만 보임. `phaserGame` 잔재 없음.

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @forge/game-inflation-rpg typecheck 2>&1 | grep -E '^(src/|tests/)' | head -10`
Expected: 관련 에러 없음.

- [ ] **Step 4: E2E 실행하여 슬롯 rename 이 플로우를 깨지 않는지 검증**

Run: `pnpm --filter @forge/game-inflation-rpg e2e 2>&1 | tail -10`
Expected: 3 passed.

만약 실패하면:
- `window.gameInstance` 가 undefined — startGame.ts 의 슬롯 rename 이 안 됐거나 오타. Step 1 확인.
- helper 내부에 `phaserGame` 잔재 — Step 2 의 grep 로 재확인.

- [ ] **Step 5: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add games/inflation-rpg
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "refactor(game-inflation-rpg): rename phaserGame hook slot to gameInstance

Aligns with @forge/core's StandardTestHookSlots well-known name so future
games use the same slot. inflation-rpg-specific slots (gameState,
inflationManager, ReincarnationManager) stay as custom slots."
```

---

### Task 8: dev-shell 에서 `ForgeGameInstance` 타입 채택

**Files:**
- Modify: `apps/dev-shell/src/lib/registry.ts`
- Modify: `apps/dev-shell/src/components/GameMountInner.tsx`

- [ ] **Step 1: registry.ts 수정**

Open `apps/dev-shell/src/lib/registry.ts`. 현재:
```ts
import type { GameManifestValue } from '@forge/core/manifest';

export interface RegisteredGame {
  manifest: GameManifestValue;
  load: () => Promise<{
    StartGame: (config: {
      parent: string;
      assetsBasePath: string;
      exposeTestHooks: boolean;
    }) => unknown;
  }>;
}
```

다음으로 교체:
```ts
import type { GameManifestValue, ForgeGameInstance } from '@forge/core';

export interface RegisteredGame {
  manifest: GameManifestValue;
  load: () => Promise<{
    StartGame: (config: {
      parent: string;
      assetsBasePath: string;
      exposeTestHooks: boolean;
    }) => ForgeGameInstance;
  }>;
}
```

(이전에 `@forge/core/manifest` subpath 를 썼지만, 지금은 배럴에서 `GameManifestValue` 도 제공하므로 `@forge/core` 루트 import 로 단순화.)

`registeredGames` 배열과 `findGame` 함수는 수정 없이 그대로 둔다.

- [ ] **Step 2: GameMountInner.tsx 수정**

Open `apps/dev-shell/src/components/GameMountInner.tsx`. 현재 안에 다음 shape 의 선언이 있다:
```ts
let gameInstance: { destroy?: (removeCanvas?: boolean) => void } | null = null;
```
그리고 `as typeof gameInstance` 캐스트.

다음으로 바꾼다. 파일 상단 import 추가:
```ts
import type { ForgeGameInstance } from '@forge/core';
```

`gameInstance` 선언을:
```ts
let gameInstance: ForgeGameInstance | null = null;
```

`mod.StartGame({...}) as typeof gameInstance` 부분을 단순히:
```ts
gameInstance = mod.StartGame({
  parent: containerId,
  assetsBasePath,
  exposeTestHooks: process.env.NODE_ENV !== 'production',
});
```

(`as` 캐스트 제거 — `StartGame` 반환 타입이 이제 `ForgeGameInstance` 로 강타입.)

cleanup 의 `gameInstance?.destroy?.(true)` 는 `ForgeGameInstance.destroy` 가 optional 이 아니므로 `gameInstance?.destroy(true)` 로도 되지만, 안전을 위해 `?.destroy(true)` 로 유지.

- [ ] **Step 3: typecheck**

Run: `pnpm --filter @forge/dev-shell typecheck 2>&1 | tail -10`
Expected: exit 0.

- [ ] **Step 4: dev-shell 포털 smoke E2E**

Run: `pnpm --filter @forge/dev-shell e2e 2>&1 | tail -8`
Expected: 2 passed (Phase 1 의 업데이트된 smoke 들).

- [ ] **Step 5: game E2E**

Run: `pnpm --filter @forge/game-inflation-rpg e2e 2>&1 | tail -10`
Expected: 3 passed. 슬롯 이름 변경 + 타입 교체 양쪽 모두 지난 상태에서 플로우가 여전히 정상.

- [ ] **Step 6: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add apps/dev-shell/src
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "refactor(dev-shell): use ForgeGameInstance type, remove unknown casts"
```

---

### Task 9: 문서 갱신

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `packages/2d-core/README.md`

- [ ] **Step 1: ARCHITECTURE.md 의 "알려진 부채" 에서 `unknown` 항목 제거**

Open `docs/ARCHITECTURE.md`. §8 "알려진 부채" 섹션에서 다음 항목을 찾는다:
```
- **`StartGame` 반환 타입 `unknown`** — `apps/dev-shell/src/lib/registry.ts`
  에서 `StartGame` 의 반환을 `unknown` 으로 받는다. 게임 #2 도착 시
  `@forge/core` 에 `ForgeGameInstance` 인터페이스 정의로 해소한다.
```

이 세 줄을 통째로 삭제한다. 앞뒤 dash list 항목 사이 공백 한 줄은 유지.

- [ ] **Step 2: `packages/2d-core/README.md` 의 "현재 공개 API" 갱신**

Open `packages/2d-core/README.md`. "현재 공개 API" 섹션에서 현재:
```
- `GameManifest` — zod 스키마. 게임이 dev-shell 에 자신을 광고할 때 쓰는
  shape 를 정의한다.
- `parseGameManifest(input)` — 위 스키마로 파싱. 잘못된 입력은 throw.
- `GameManifestInput`, `GameManifestValue` — TypeScript 타입.
```

다음으로 교체:
```
- `GameManifest` — zod 스키마. 게임이 dev-shell 에 자신을 광고할 때 쓰는
  shape 를 정의한다.
- `parseGameManifest(input)` — 위 스키마로 파싱. 잘못된 입력은 throw.
- `GameManifestInput`, `GameManifestValue` — TypeScript 타입.
- `ForgeGameInstance` — 게임 인스턴스 구조 타입. `destroy(removeCanvas?)` 만
  요구. dev-shell 이 생명주기 종료에 사용한다.
- `StartGameFn<TConfig>` — `(config) => ForgeGameInstance` 시그니처 제네릭.
- `exposeTestHooks(slots)` — `window` 에 게임 상태 슬롯을 opt-in 으로 부착.
  `StandardTestHookSlots` (`gameInstance`, `currentScene`) 은 well-known 이름.
- `createSaveEnvelopeSchema<T>(dataSchema)` — 세이브 envelope Zod 헬퍼.
  `SaveEnvelopeMeta` 도 data-agnostic 파싱용으로 제공.
```

- [ ] **Step 3: "향후 승격 후보" 에서 이미 한 것 제거, 업데이트**

같은 파일의 "향후 승격 후보" 섹션을 찾는다. 현재 그 안에 `exposeTestHooks()` 가 있다. 그 항목을 **삭제**한다 (이미 승격됨).

추가로 Save 관련 항목을 다음으로 업데이트:
```
- `SaveManager` — localStorage 기반 세이브 구현. envelope shape 은 이미
  `createSaveEnvelopeSchema` 로 박제됨. 게임 #2 도착 시 I/O + namespace 처리
  로직이 @forge/core 로 이동.
```

다른 후보(`EventBus`, `I18nManager`, `ForgeGameInstance`)는:
- `ForgeGameInstance` 는 이미 완료 — 이 항목도 삭제.
- `EventBus`, `I18nManager` 는 그대로 후보 유지.

- [ ] **Step 4: 파일 최종 확인**

Run:
```bash
grep -n "unknown" docs/ARCHITECTURE.md | head -5
grep -n "ForgeGameInstance\|SaveEnvelope\|exposeTestHooks" packages/2d-core/README.md | head -10
```
Expected: ARCHITECTURE.md 에 `StartGame 반환 unknown` 언급이 없다. README 에 새 계약들이 "현재 공개 API" 에 있고 "승격 후보"에서는 빠져 있다.

- [ ] **Step 5: Commit**

```bash
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" add docs/ARCHITECTURE.md packages/2d-core/README.md
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" commit -m "docs: reflect Phase 1.5a — new core contracts shipped, unknown debt resolved"
```

---

### Task 10: 최종 전체 검증 + 태그

**Files:** (없음 — 검증만)

- [ ] **Step 1: Clean install**

Run:
```bash
rm -rf node_modules apps/*/node_modules packages/*/node_modules games/*/node_modules
pnpm install --frozen-lockfile 2>&1 | tail -5
```
Expected: 에러 없이 완료.

- [ ] **Step 2: 전체 turbo pipeline**

Run: `pnpm turbo run typecheck lint test --force 2>&1 | tail -10`
Expected: 모든 workspace 녹색. `@forge/core` 테스트가 17개 통과.

- [ ] **Step 3: 순환 의존 검사**

Run: `pnpm circular 2>&1 | tail -3`
Expected: `No circular dependency found!`.

- [ ] **Step 4: 포털 smoke + 게임 E2E**

Run: `pnpm --filter @forge/dev-shell e2e 2>&1 | tail -5`
Expected: 2 passed.

Run: `pnpm --filter @forge/game-inflation-rpg e2e 2>&1 | tail -5`
Expected: 3 passed.

- [ ] **Step 5: Release build smoke**

Run: `pnpm --filter @forge/game-inflation-rpg build 2>&1 | tail -5`
Expected: `out/` 생성.

- [ ] **Step 6: 태그**

만약 `next-env.d.ts` 가 더럽다면 `git checkout -- apps/dev-shell/next-env.d.ts games/inflation-rpg/next-env.d.ts 2>/dev/null` 로 복원.

```bash
git status --short
git -c user.name="Joel" -c user.email="joel.ship@kakaopaycorp.com" tag phase-1.5a-complete
git log --oneline | head -15
git tag --list
```

태그 push 하지 않는다. 사용자가 직접 결정.

---

## Self-Review

**1. Spec coverage:**

| Spec 섹션 | Task |
|---|---|
| §0 성공 기준 #1 (3개 contract export) | Task 2, 3, 4, 5 |
| §0 성공 기준 #2 (inflation-rpg import 교체) | Task 6 |
| §0 성공 기준 #3 (dev-shell unknown 제거) | Task 8 |
| §0 성공 기준 #4 (vitest 17개 근처) | Task 2 (3 추가) + Task 3 (4 추가) + Task 4 (8 추가) = 15 new + 4 기존 = 19 ≈ 17~20 |
| §0 성공 기준 #5 (전체 파이프라인 통과) | Task 10 |
| §1 ForgeGameInstance | Task 2 |
| §2 exposeTestHooks 승격 + 슬롯 rename | Task 3, 6, 7 |
| §3 SaveEnvelope | Task 4 |
| §4 배럴 export | Task 5 |
| §5 작업 순서 | Task 1~10 전체 |
| §6 비목표 (SaveManager 구현 안 함 등) | 스펙에 명시, 어떤 Task 도 건드리지 않음 |
| §7 vitest jsdom 전환 위험 | Task 1 |
| §7 슬롯 rename 위험 | Task 7 Step 4 의 E2E 검증 |

**2. Placeholder scan:** TBD/TODO 없음. 모든 코드 블록 완전. 수정 위치는 "현재 내용을 이걸로 교체" 형태로 구체적.

**3. Type consistency:**
- `ForgeGameInstance.destroy(removeCanvas?: boolean): void` — Task 2 정의, Task 7/8 에서 사용. 일치.
- `TestHookSlots` 의 well-known 슬롯 `gameInstance` — Task 3 정의, Task 7 에서 inflation-rpg 가 그 이름으로 주입. 일치.
- `StartGameFn<TConfig>` — Task 2 에서 정의, Task 8 에서 dev-shell registry 가 사용 (직접은 아니고 inline 타입이지만 반환이 `ForgeGameInstance`).
- `createSaveEnvelopeSchema<T>(dataSchema: T): z.ZodObject<typeof metaShape & { data: T }>` — Task 4 정의. 사용자는 Phase 1.5a 범위에 없음 (게임 #2 때 실제 사용).

**4. 주요 의존성 일관성:**
- Task 1 의 jsdom 전환이 Task 3 의 `exposeTestHooks` 테스트에 필수 — 순서 정확.
- Task 5 의 배럴이 Task 6 의 `import { exposeTestHooks } from '@forge/core'` 에 필수 — 순서 정확.
- Task 7 의 슬롯 rename 이 Task 8 의 타입 교체와 독립 — 순서 OK.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-18-core-contracts.md`. Two execution options:

1. **Subagent-Driven (recommended)** — 각 태스크당 fresh subagent dispatch, 태스크 사이 리뷰, 빠른 반복. 10 태스크 중 Task 2~4 는 TDD 가 반복되는 bite-sized 작업이라 subagent 가 잘 처리.
2. **Inline Execution** — executing-plans 로 이 세션에서 체크포인트와 함께 배치 실행.

Which approach?
