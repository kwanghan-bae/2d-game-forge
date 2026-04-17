# @forge/core

forge 의 모든 게임이 의존하는 베이스 패키지. 4계층 케이크의 가장 아래 슬롯.

## 현재 공개 API

Phase 1 시점 이 패키지는 **거의 비어 있다**. 의도된 상태다.

- `GameManifest` — zod 스키마. 게임이 dev-shell 에 자신을 광고할 때 쓰는
  shape 를 정의한다.
- `parseGameManifest(input)` — 위 스키마로 파싱. 잘못된 입력은 throw.
- `GameManifestInput`, `GameManifestValue` — TypeScript 타입.

진입점:

- `import { GameManifest, parseGameManifest } from '@forge/core'`
- `import type { GameManifestValue } from '@forge/core'`
- `import { ... } from '@forge/core/manifest'` — subpath 도 동등하게 동작.

## 왜 비어 있나

forge 는 "3의 규칙" 을 따른다 — 같은 코드가 두 게임에서 실제로 쓰이는 것이
확인되기 전에는 코어로 승격하지 않는다.

상세 원칙은 [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §3 참고.

## 향후 승격 후보 (예정 아닌, 후보)

게임 #2 가 도착했을 때 inflation-rpg 와 같은 방식으로 사용한다고 확인되면
승격될 가능성이 큰 코드:

- `EventBus` — Phaser ↔ React 간 이벤트 브리지. 거의 모든 게임에 필요.
- `SaveManager` — localStorage 기반 세이브. 게임마다 namespace 도입 필요.
- `I18nManager` — 다국어 처리. 모든 게임이 i18n 을 한다고 가정.
- `exposeTestHooks()` — 현재 inflation-rpg 안에 있음 (`src/game/testHooks.ts`).
- `ForgeGameInstance` 인터페이스 — `StartGame` 의 반환 타입을 통일.

승격은 [ARCHITECTURE.md](../../docs/ARCHITECTURE.md) §3 의 mechanical 절차를
따른다.

## 의존성

- runtime: `zod ^4.3.6`
- dev: vitest, eslint, typescript

다른 어떤 워크스페이스도 import 하지 않는다 (의존성 단방향 규칙).

## 스크립트

```bash
pnpm --filter @forge/core typecheck
pnpm --filter @forge/core test
pnpm --filter @forge/core lint
```

## 테스트

`tests/manifest.test.ts` — `parseGameManifest` 의 입력 검증. 4개 케이스
(정상, slug 형식 위반, 빈 title, assetsBasePath 형식 위반).

## 더 읽을 것

- [docs/ARCHITECTURE.md](../../docs/ARCHITECTURE.md) — 4계층 케이크와 의존성
  규칙.
- [docs/CONTRIBUTING.md](../../docs/CONTRIBUTING.md) §12 — 새 콘텐츠 팩 / 장르
  코어 / 플러그인 추가 방법.
