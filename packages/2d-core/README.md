# @forge/core

forge 의 모든 게임이 의존하는 베이스 패키지. 4계층 케이크의 가장 아래 슬롯.

## 현재 공개 API

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

진입점:

- `import { GameManifest, parseGameManifest, exposeTestHooks, createSaveEnvelopeSchema, SaveEnvelopeMeta } from '@forge/core'`
- `import type { GameManifestValue, ForgeGameInstance, StartGameFn, StandardTestHookSlots, TestHookSlots } from '@forge/core'`
- `import { ... } from '@forge/core/manifest'` — subpath 도 여전히 동작.

## 성장 정책

forge 는 "3의 규칙" 을 따른다 — 같은 **구현 코드**가 두 게임에서 실제로
쓰이는 것이 확인되기 전에는 코어로 승격하지 않는다. 하지만 **타입·계약**은
구현을 강제하지 않으므로 게임 하나일 때도 선제 정의가 가능하다. 위 API 중
`ForgeGameInstance`, `StartGameFn`, `exposeTestHooks`, `createSaveEnvelopeSchema`
는 그런 선제 계약이다.

상세 원칙은 [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §3 참고.

## 향후 승격 후보 (예정 아닌, 후보)

게임 #2 가 도착했을 때 inflation-rpg 와 같은 방식으로 사용한다고 확인되면
승격될 가능성이 큰 코드:

- `SaveManager` — localStorage 기반 세이브 구현. envelope shape 은 이미
  `createSaveEnvelopeSchema` 로 박제됨. 게임 #2 도착 시 I/O + namespace 처리
  로직이 `@forge/core` 로 이동.
- `EventBus` — Phaser ↔ React 간 이벤트 브리지. 거의 모든 게임에 필요.
- `I18nManager` — 다국어 처리. 모든 게임이 i18n 을 한다고 가정.

승격은 [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §3 의 mechanical 절차를
따른다.

## 의존성

- runtime: `zod ^4.3.6`
- dev: vitest (jsdom), eslint, typescript, jsdom

다른 어떤 워크스페이스도 import 하지 않는다 (의존성 단방향 규칙).

## 스크립트

```bash
pnpm --filter @forge/core typecheck
pnpm --filter @forge/core test
pnpm --filter @forge/core lint
```

## 테스트

- `tests/manifest.test.ts` — `parseGameManifest` 입력 검증 (4개).
- `tests/game-instance.test.ts` — `ForgeGameInstance`·`StartGameFn` 타입 계약
  (3개).
- `tests/test-hooks.test.ts` — `exposeTestHooks` 의 well-known/커스텀/undefined/
  multi-call 동작 (4개).
- `tests/save-envelope.test.ts` — Zod envelope 래퍼·메타 전용 스키마 (8개).

합 19 tests.

## 더 읽을 것

- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — 4계층 케이크와 의존성
  규칙.
- [docs/CONTRIBUTING.md](../../docs/CONTRIBUTING.md) §12 — 새 콘텐츠 팩 / 장르
  코어 / 플러그인 추가 방법.
